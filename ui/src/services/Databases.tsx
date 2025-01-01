import { SqlContainer } from '../models/SqlContainer';
import { SqlDatabase } from '../models/SqlDatabase';
import { RequestError } from '../models/RequestError';


export async function ListDatabases(ddClient, container: SqlContainer): Promise<SqlDatabase[]> {
    const result = await ddClient.extension.vm?.service?.post('/listDatabases', { SApassword: container.SApassword, Port: String(container.Port1433), Databasename: "master" });
    
    var databaselist: SqlDatabase[] = [];

    if (result && result.databases) {
        for (var i = 0; i < result.databases.length; i++) {
            var db = new SqlDatabase(result.databases[i].name, result.databases[i].id);
            databaselist.push(db);
        }
    }
    return databaselist;
}

export async function CreateDatabase(ddClient, container: SqlContainer, databaseName: string): Promise<SqlDatabase[]> {
    try {
        const result = await ddClient.extension.vm?.service?.post('/createDatabase', { SApassword: container.SApassword, Port: String(container.Port1433), Databasename: databaseName });

        var databaselist: SqlDatabase[] = [];

        if (result && result.databases) {
            for (var i = 0; i < result.databases.length; i++) {
                var db = new SqlDatabase(result.databases[i].name, result.databases[i].id);
                databaselist.push(db);
            }
        }
        return databaselist;
    } catch (error) {
        console.log("error");
        console.log(error.message);
        if (error instanceof RequestError) {
            throw new Error(error.name + ": " + error.message);
        } else {
            throw new Error("Unknown error: " + error.message);
        }
    }
}
