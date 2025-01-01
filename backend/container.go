package main

import (
	"context"
	"io"
	"net/http"
	"strings"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/mount"
	"github.com/docker/docker/api/types/volume"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
	"github.com/labstack/echo"
)

type HTTPContainerInfo struct {
	ContainerId string `json:"containerId"`
}

type HTTPVolumePath struct {
	VolumePath string `json:"volumePath"`
}

type ContainerInput struct {
	Image         string `json:"image"`
	SApassword    string `json:"saPassword"`
	Port          string `json:"port"`
	ContainerName string `json:"containerName"`
	VolumeName    string `json:"volumeName,omitempty"`
	VolumePath    string `json:"volumePath,omitempty"`
}

var sqlcontainerimages = []string{
	"mcr.microsoft.com/mssql/server",
	// "mcr.microsoft.com/azure-sql-edge",
}

// function for post request to create container
func createContainer(ctx echo.Context) error {
	containerId := "something"

	// get container config from post body ContainerInput
	var containerInput ContainerInput
	err := ctx.Bind(&containerInput)
	if err != nil {
		logger.Error("JSON body error: ", err)
		return ctx.String(http.StatusBadRequest, "JSON body error")
	}

	// check if image is valid
	validImage := false
	for _, image := range sqlcontainerimages {
		if strings.Contains(containerInput.Image, image) {
			validImage = true
		}
	}
	if !validImage {
		return ctx.String(http.StatusBadRequest, "Image not supported: "+containerInput.Image)
	}

	dctx := context.Background()
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		panic(err)
	}
	defer cli.Close()

	// pull image
	out, err := cli.ImagePull(dctx, containerInput.Image, image.PullOptions{})
	if err != nil {
		return ctx.String(http.StatusInternalServerError, "Error pulling image: "+err.Error())
	}
	defer out.Close()
	io.Copy(io.Discard, out)

	// create volume
	err = createVolume(cli, dctx, containerInput.VolumeName, containerInput.VolumePath)

	containerConfig := &container.Config{
		Image: containerInput.Image,
		Env:   []string{"ACCEPT_EULA=1", "MSSQL_PID=Express", "MSSQL_SA_PASSWORD=" + containerInput.SApassword},
		ExposedPorts: nat.PortSet{
			nat.Port("1433/tcp"): {},
		},
	}

	hostConfig := &container.HostConfig{
		PortBindings: nat.PortMap{
			nat.Port("1433/tcp"): []nat.PortBinding{
				{
					HostIP:   "0.0.0.0",
					HostPort: containerInput.Port,
				},
			},
		},
		Mounts: []mount.Mount{
			{
				Type:   "volume",
				Source: containerInput.VolumeName,
				Target: "/var/opt/mssql",
			},
		},
	}

	resp, err := cli.ContainerCreate(dctx, containerConfig, hostConfig, nil, nil, containerInput.ContainerName)
	if err != nil {
		logger.Error("Error creating container: ", err)
		return ctx.String(http.StatusInternalServerError, "Error creating container: "+err.Error())
	}

	if err := cli.ContainerStart(dctx, resp.ID, container.StartOptions{}); err != nil {
		return ctx.String(http.StatusInternalServerError, "Error starting container: "+err.Error())
	}
	containerId = resp.ID

	return ctx.JSON(http.StatusCreated, HTTPContainerInfo{ContainerId: containerId})
}

// GET request to list containers
func listContainers(ctx echo.Context) error {
	dctx := context.Background()

	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		panic(err)
	}
	defer cli.Close()

	containers, err := cli.ContainerList(dctx, container.ListOptions{All: true})
	if err != nil {
		panic(err)
	}

	// create new array of containers
	// filtering out the ones that are not SQL containers
	var sqlcontainers []types.ContainerJSON
	for _, container := range containers {
		containeradded := false

		// inspect the container
		inspectedContainer, err := cli.ContainerInspect(context.Background(), container.ID)
		if err != nil {
			panic(err)
		}

		imageName := strings.Split(inspectedContainer.Config.Image, ":")[0]
		// if container.Image in sqlcontainers[]
		for _, sqlcontainer := range sqlcontainerimages {
			if imageName == sqlcontainer {
				sqlcontainers = append(sqlcontainers, inspectedContainer)
				containeradded = true
				break
			}
		}
		if containeradded {
			continue
		}
		// or if container.Ports contains 1433
		if _, ok := inspectedContainer.HostConfig.PortBindings["1433/tcp"]; ok {
			sqlcontainers = append(sqlcontainers, inspectedContainer)
		}
	}

	return ctx.JSON(http.StatusOK, sqlcontainers)
}

// POST request to start container with HTTPContainerInfo
func startContainer(ctx echo.Context) error {
	dctx := context.Background()

	// get container config from post body HTTPContainerInfo
	var containerInfo HTTPContainerInfo
	err := ctx.Bind(&containerInfo)
	if err != nil {
		logger.Error("JSON body error: ",
			err)
		return ctx.String(http.StatusBadRequest, "JSON body error")
	}

	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		panic(err)
	}
	defer cli.Close()

	err = cli.ContainerStart(dctx, containerInfo.ContainerId, container.StartOptions{})
	if err != nil {
		return ctx.String(http.StatusInternalServerError, "Error starting container: "+err.Error())
	}

	return ctx.String(http.StatusOK, "Container started")
}

// POST request to stop container with HTTPContainerInfo
func stopContainer(ctx echo.Context) error {
	dctx := context.Background()

	// get container config from post body HTTPContainerInfo
	var containerInfo HTTPContainerInfo
	err := ctx.Bind(&containerInfo)
	if err != nil {
		logger.Error("JSON body error: ",
			err)
		return ctx.String(http.StatusBadRequest, "JSON body error")
	}

	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		panic(err)
	}
	defer cli.Close()

	err = cli.ContainerStop(dctx, containerInfo.ContainerId, container.StopOptions{})
	if err != nil {
		return ctx.String(http.StatusInternalServerError, "Error stopping container: "+err.Error())
	}

	return ctx.String(http.StatusOK, "Container stopped")
}

// POST request to delete container with HTTPContainerInfo
// returns HTTPVolumePath
func deleteContainer(ctx echo.Context) error {
	dctx := context.Background()

	// get container config from post body HTTPContainerInfo
	var containerInfo HTTPContainerInfo
	err := ctx.Bind(&containerInfo)
	if err != nil {
		logger.Error("JSON body error: ",
			err)
		return ctx.String(http.StatusBadRequest, "JSON body error")
	}

	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		panic(err)
	}
	defer cli.Close()

	// get the container info
	containerJson, err := cli.ContainerInspect(dctx, containerInfo.ContainerId)
	if err != nil {
		return ctx.String(http.StatusInternalServerError, "Error inspecting container: "+err.Error())
	}
	volumeName := containerJson.HostConfig.Mounts[0].Source

	err = cli.ContainerRemove(dctx, containerInfo.ContainerId, container.RemoveOptions{Force: true})
	if err != nil {
		return ctx.String(http.StatusInternalServerError, "Error deleting container: "+err.Error())
	}

	// get the volume path
	volumePath := ""
	volumeJson, err := cli.VolumeInspect(dctx, volumeName)
	if err != nil {
		return ctx.String(http.StatusInternalServerError, "Error inspecting volume: "+err.Error())
	}
	volumePath = volumeJson.Options["device"]

	err = cli.VolumeRemove(dctx, volumeName, true)
	if err != nil {
		return ctx.String(http.StatusInternalServerError, "Error deleting volume: "+err.Error())
	}

	return ctx.JSON(http.StatusOK, HTTPVolumePath{VolumePath: volumePath})
}

// function for creating a persistent volume
func createVolume(client *client.Client, dctx context.Context, volumeName string, volumePath string) error {
	volumeConfig := &volume.CreateOptions{
		Name:   volumeName,
		Driver: "local",
		DriverOpts: map[string]string{
			"device": volumePath,
			"o":      "bind",
			"type":   "none",
		},
	}

	_, err := client.VolumeCreate(dctx, *volumeConfig)
	if err != nil {
		return err
	}

	return nil
}
