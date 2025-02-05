import { ContainerConfig } from '../models/ContainerConfig';
import { SqlContainer } from '../models/SqlContainer';
import { RequestError } from '../models/RequestError';

export async function CreateContainer(ddClient, containerConfig: ContainerConfig) {
    var result = { status: 0, body: "", containerId: "" };
    try {
        var createVolumeFolder = "createVolumeFolder.sh";
        var pathSeparator = "/";
        if (ddClient.host.platform === "win32") {
            createVolumeFolder = "createVolumeFolder.cmd";
        }

        const volumePathResult = await ddClient.extension.host?.cli.exec(createVolumeFolder, [containerConfig.ContainerName]);
        console.log(volumePathResult);
        containerConfig.VolumePath = volumePathResult.stdout.replaceAll("\\", "/").trim();
        
        console.log("VolumePath: " + containerConfig.VolumePath);

        // parse the volume name from the last segment of the volume path
        const volumePathSegments = containerConfig.VolumePath.split(pathSeparator);
        containerConfig.VolumeName = volumePathSegments[volumePathSegments.length - 1];

        var createResponse = await ddClient.extension.vm?.service?.post('/createContainer', containerConfig);
        result.body = JSON.stringify(createResponse);
        result.containerId = createResponse.containerId;
        result.status = 201;
    } catch (error) {
        console.log(error.message);
        if (error instanceof RequestError) {
            result.status = error.statusCode;
            result.body = error.name + ": " + error.message;
        } else {
            result.status = 500;
            result.body = "Unknown error: " + error.message;
        }
    }

    return result;
}

export async function ListContainers(ddClient): Promise<SqlContainer[]> {
    const result = await ddClient.extension.vm?.service?.get('/listContainers');
    var containerlist: SqlContainer[] = [];

    if (result) {
        for (var i = 0; i < result.length; i++) {
            var portNumber: number = 0;
            var saPassword: string = "";

            if (result[i].HostConfig.PortBindings['1433/tcp']) {
                portNumber = parseInt(result[i].HostConfig.PortBindings['1433/tcp'][0].HostPort);
            }

            // for each in Config.Env array
            // look for item that starts with MSSQL_SA_PASSWORD
            result[i].Config.Env.forEach((envItem: string) => {
                if (envItem.split("=")[0] === "MSSQL_SA_PASSWORD") {
                    saPassword = envItem.split("=")[1]
                }
            });

            // remove first character from name
            var name: string = result[i].Name

            var container = new SqlContainer(result[i].Id, result[i].Name.substring(1), result[i].Config.Image, result[i].State.Status, portNumber, saPassword);
            containerlist.push(container);
        }
    }
    return containerlist;
}

export async function StartContainer(ddClient, containerId: string) {
    var result = { status: 0, body: "" };
    try {
        result.body = await ddClient.extension.vm?.service?.post('/startContainer', { ContainerId: containerId });
        result.status = 200;
    } catch (error) {
        if (error instanceof RequestError) {
            result.status = error.statusCode;
            result.body = error.name + ": " + error.message;
        } else {
            result.status = 500;
            result.body = "Unknown error: " + error;
        }
    }

    return result;
}

export async function StopContainer(ddClient, containerId: string) {
    var result = { status: 0, body: "" };
    try {
        result.body = await ddClient.extension.vm?.service?.post('/stopContainer', { ContainerId: containerId });
        result.status = 200;
    } catch (error) {
        if (error instanceof RequestError) {
            result.status = error.statusCode;
            result.body = error.name + ": " + error.message;
        } else {
            result.status = 500;
            result.body = "Unknown error: " + error.message;
        }
    }

    return result;
}

export async function DeleteContainer(ddClient, containerId: string, deleteVolume: boolean) {
    var result = { status: 0, body: "" };
    try {
        var deleteResponse = await ddClient.extension.vm?.service?.post('/deleteContainer', { ContainerId: containerId });
        result.body = JSON.stringify(deleteResponse);
        result.status = 200;
        const volumePath = deleteResponse.volumePath;

        if (deleteVolume == true) {
            var deleteVolumeFolder = "deleteVolumeFolder.sh";
            if (ddClient.host.platform === "win32") {
                deleteVolumeFolder = "deleteVolumeFolder.cmd";
            }
            await ddClient.extension.host?.cli.exec(deleteVolumeFolder, [volumePath]);
        }
    } catch (error) {
        console.log("error removing container:", error.message);
        if (error instanceof RequestError) {
            result.status = error.statusCode;
            result.body = error.name + ": " + error.message;
        } else {
            result.status = 500;
            result.body = "Unknown error: " + error.message;
        }
    }

    return result;
}