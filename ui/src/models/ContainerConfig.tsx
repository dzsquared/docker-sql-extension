// class for container config
// image, sa password, port

export class ContainerConfig {
    image: string;
    ContainerName: string;
    saPassword: string;
    port: string;
    VolumeName: string = "";
    VolumePath: string = "";

    constructor(image: string, ContainerName: string, saPassword: string, port: string, VolumeName?: string, VolumePath?: string) {
        this.image = image;
        this.ContainerName = ContainerName;
        this.saPassword = saPassword;
        this.port = port;
        this.VolumeName = VolumeName || "";
        this.VolumePath = VolumePath || "";
    }
}