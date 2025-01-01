package main

import (
	"log"
	"net/http"
	"os"
	"os/exec"

	"github.com/labstack/echo"
)

// ready checks whether sqlcl is ready or not by querying localhost:9080.
func readyConnection(ctx echo.Context) error {
	if ttyd.IsRunning() {
		return ctx.String(http.StatusOK, "true")
	}

	return ctx.String(http.StatusServiceUnavailable, "false")
}

// start starts ttyd with the provided connection.
func startConnection(ctx echo.Context) error {
	// get container config from post body ContainerInput
	var containerInfo ContainerInfo
	err := ctx.Bind(&containerInfo)
	if err != nil {
		logger.Error("JSON body error: ", err)

		return ctx.String(http.StatusBadRequest, "JSON body error")
	}

	if err := ttyd.Start(containerInfo); err != nil {
		log.Printf("failed to start ttyd error is: %s\n", err)

		return echo.NewHTTPError(http.StatusInternalServerError)
	}

	return ctx.String(http.StatusOK, "true")
}

func stopConnection(ctx echo.Context) error {
	if err := ttyd.Stop(); err != nil {
		log.Printf("failed to stop ttyd: %s\n", err)

		return echo.NewHTTPError(http.StatusInternalServerError)
	}

	return ctx.String(http.StatusOK, "true")
}

type TTYD struct {
	process *os.Process
}

func (t *TTYD) Start(containerInfo ContainerInfo) error {
	if !t.IsStarted() {
		args := []string{"-W", "-u", "1000", "-g", "1000", "-t", "titleFixed='sqlcmd'"}

		args = append(args, "/bin/bash", "/cli/sql.sh", containerInfo.Port, containerInfo.Databasename, containerInfo.SApassword)

		cmd := exec.Command("/usr/bin/ttyd", args...)
		if err := cmd.Start(); err != nil {
			return err
		}

		t.process = cmd.Process
		log.Println("started ttyd")
	}

	return nil
}

func (t *TTYD) Stop() error {
	if !t.IsStarted() {
		return nil
	}

	if err := t.process.Kill(); err != nil {
		log.Printf("failed to stop ttyd: %s\n", err)
		return err
	}
	t.process.Wait()
	t.process = nil

	return nil
}

func (t TTYD) IsStarted() bool {
	return t.process != nil
}

func (t *TTYD) IsRunning() bool {
	if !t.IsStarted() {
		return false
	}

	url := "http://localhost:7681/" // 7681 is the default port for ttyd
	resp, err := http.Get(url)
	if err != nil {
		log.Println(err)
		return false

	}

	return resp.StatusCode == http.StatusOK
}
