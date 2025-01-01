import { SqlDatabase } from "./SqlDatabase";

export class SqlContainer {
    Id: string;
    Name: string;
    Image: string;
    Status: string;
    Port1433: number;
    SApassword: string;
    Databases: SqlDatabase[] = [];

    constructor(Id: string, Name: string, Image: string, Status: string, Port1433: number, SApassword: string) {
        this.Id = Id;
        this.Name = Name;
        this.Image = Image;
        this.Status = Status;
        this.Port1433 = Port1433;
        this.SApassword = SApassword;
    }

    public displayId(): string {
        // convert Id to just the first 12 characters
        return this.Id.substring(0, 12);
    }

    // converts image name to last segment after /, e.g. mcr.microsoft.com/mssql/server:2019-latest to 2019-latest
    public displayImage(): string {
        return this.Image.split("/").pop();
    }

    // creates a connection string for the container
    // format is "Server=localhost,PortNumber;Initial Catalog=master;User Id=sa;Password=myPassword;TrustServerCertificate=true"
    public connectionString(includeSpaces?:boolean): string {
        var connectionString: string = `Server=localhost,${this.Port1433};Initial Catalog=master;User Id=sa;Password=${this.SApassword};TrustServerCertificate=true`;

        if (includeSpaces) {
            connectionString = `Server=localhost,${this.Port1433}; Initial Catalog=master; User Id=sa; Password=${this.SApassword}; TrustServerCertificate=true`;
        }

        return connectionString;
    }

    public adsConnectionURI(): string {
        return `azuredatastudio://openConnectionDialog?connectionName=${this.Name}&server=localhost,${this.Port1433}&authenticationType=SqlLogin&user=sa&password=${this.SApassword}&database=master&connectionProperties={"trustServerCertificate":"true"}`;
    }

}
