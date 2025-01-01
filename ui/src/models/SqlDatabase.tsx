
export class SqlDatabase {
    Name: string;
    Id: string;

    constructor(Name: string, Id: string) {
        this.Name = Name;
        this.Id = Id;
    }
}

export class DatabaseContainer {
    ContainerId: string;
    Databases: SqlDatabase[];

    constructor(ContainerId: string, Name: string, Databases: SqlDatabase[]) {
        this.ContainerId = ContainerId;
        this.Databases = Databases;
    }
}