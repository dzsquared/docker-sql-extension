import React from 'react';
import { createDockerDesktopClient } from '@docker/extension-api-client';
import { Alert, AppBar, Divider, Dialog, IconButton, List, ListItem, Stack, Toolbar, Tooltip, Typography } from '@mui/material';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { ReactPlugin, useAppInsightsContext } from '@microsoft/applicationinsights-react-js';

import { NewContainer } from './components/NewContainer';
import { ContainerList } from './components/ContainerList';
import { ContainerConfig } from './models/ContainerConfig';
import { SqlContainer } from './models/SqlContainer';
import { DatabaseContainer, SqlDatabase } from './models/SqlDatabase';
import { CreateContainer, ListContainers, StartContainer, StopContainer, DeleteContainer } from './services/Containers';
import { ListDatabases, CreateDatabase } from './services/Databases';

const client = createDockerDesktopClient();

export function useDockerDesktopClient() {
  return client;
}

var reactPlugin = new ReactPlugin();
var appInsights = new ApplicationInsights({
    config: {
        connectionString: 'InstrumentationKey=964ae66b-3eab-4098-a7ac-3c3be3029eaa;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/;ApplicationId=e28c56d5-5b90-4045-b10a-ebde5ca0caa3',
        extensions: [reactPlugin],
    }
});
appInsights.loadAppInsights();

function trackEvent(name: string, properties: any) {
  appInsights.trackEvent({ name: name, properties: properties });
}

export function App() {
  const appInsights = useAppInsightsContext();
  const [containerConfig, setContainerConfig] = React.useState<ContainerConfig>();
  const [newDatabase, setNewDatabase] = React.useState<string>("");
  const [createResponse, setCreateResponse] = React.useState({});
  const [containers, setContainers] = React.useState<SqlContainer[]>();
  const [databases, setDatabases] = React.useState<DatabaseContainer[]>();
  const [openHelp, setOpenHelp] = React.useState(false);


  const handleClickOpenHelp = () => {
    trackEvent("HelpMenu", { action: "open" });
    setOpenHelp(true);
  }

  const handleHelpClose = () => {
    setOpenHelp(false);
  };

  const ddClient = useDockerDesktopClient();

  const imageList: string[] = [
    "mcr.microsoft.com/mssql/server:2022-latest",
    "mcr.microsoft.com/mssql/server:2019-latest",
    "mcr.microsoft.com/mssql/server:2017-latest"
  ];

  const onChangeNewContainerForm = (e) => {
    var newConfig;
    if (containerConfig === undefined) {
      newConfig = new ContainerConfig("", "", "", "");
    } else {
      newConfig = containerConfig;
    }
    // do something
    if (e.target.name === 'container-image') {
      newConfig.image = e.target.value;
    } else if (e.target.name === 'container-name') {
      newConfig.ContainerName = e.target.value;
    } else if (e.target.name === 'container-port') {
      newConfig.port = e.target.value;
    } else if (e.target.name === 'container-password') {
      newConfig.saPassword = e.target.value;
    } else {
      console.log("unknown field");
      console.log(e.target);
    }
    setContainerConfig(newConfig);
  };

  const callCreateService = async () => {
    const result = await CreateContainer(ddClient, containerConfig);
    if (result.status === 201) {
      trackEvent("CreateContainer", { "containerId": result.containerId });
      await updateContainerList();
    }
    setCreateResponse(result);
  };

  const updateContainerList = async () => {
    setContainers(await ListContainers(ddClient));
  };

  const onChangeNewDatabaseForm = (e) => {
    setNewDatabase(e.target.value);
  }

  const callDatabaseCreateService = async (containerId: string) => {
    trackEvent("CreateDatabase", { containerId: containerId });
    var sqlDatabases: SqlDatabase[] = [];
    const container = containers?.find((container) => container.Id === containerId);

    // call the service to create a new database
    sqlDatabases = await CreateDatabase(ddClient, container, newDatabase);

    var updatedDatabases: DatabaseContainer[] = [];
    updatedDatabases.push(new DatabaseContainer(container.Id, container.Name, sqlDatabases));

    // replace the container in the list
    databases?.forEach((aDatabaseContainer) => {
      if (aDatabaseContainer.ContainerId !== container.Id) {
        updatedDatabases.push(aDatabaseContainer);
      }
    });

    setDatabases(updatedDatabases);
  }

  const updateDatabases = async (container: SqlContainer) => {
    var sqlDatabases: SqlDatabase[] = [];
    var retryCountMax = 5;

    for (var i = 0; i < retryCountMax; i++) {
      sqlDatabases = await ListDatabases(ddClient, container);
      if (sqlDatabases.length > 0) {
        break;
      }
      // wait 5 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    var updatedDatabases: DatabaseContainer[] = [];
    updatedDatabases.push(new DatabaseContainer(container.Id, container.Name, sqlDatabases));

    // replace the container in the list
    databases?.forEach((aDatabaseContainer) => {
      if (aDatabaseContainer.ContainerId !== container.Id) {
        updatedDatabases.push(aDatabaseContainer);
      }
    });

    setDatabases(updatedDatabases);
  };

  var initialLoad = true;

  React.useEffect(() => {
    if (initialLoad) {
      updateContainerList();
      initialLoad = false;
    }
  }, []);

  const startContainer = async (containerId: string) => {
    trackEvent("StartContainer", { containerId: containerId });
    await StartContainer(ddClient, containerId);
    await updateContainerList();
  };

  const stopContainer = async (containerId: string) => {
    trackEvent("StopContainer", { containerId: containerId });
    await StopContainer(ddClient, containerId);
    await updateContainerList();
  }

  const deleteContainer = async (containerId: string, deleteVolume: boolean) => {
    trackEvent("DeleteContainer", { containerId: containerId });
    await DeleteContainer(ddClient, containerId, deleteVolume);
    await updateContainerList();
  }

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
        <Typography variant="h3">SQL containers</Typography>
        <Tooltip title="Learn more">
          <IconButton onClick={handleClickOpenHelp}>
            <HelpOutlineRoundedIcon />
          </IconButton>
        </Tooltip>
      </Stack>
      <Stack  alignItems="start" spacing={1} sx={{ mt: 2 }} divider={<Divider flexItem />}>
        <NewContainer onChangeForm={onChangeNewContainerForm} containerConfig={containerConfig} createContainer={callCreateService} imageList={imageList} createResponse={createResponse} currentContainers={containers} />
        <ContainerList currentContainers={containers} currentDatabases={databases} startContainer={startContainer} stopContainer={stopContainer} deleteContainer={deleteContainer} expandContainer={updateDatabases} onChangeForm={onChangeNewDatabaseForm} createDatabase={callDatabaseCreateService} trackEvent={trackEvent} />
      </Stack>

      <Dialog
        fullScreen
        open={openHelp}
        onClose={handleHelpClose}
      >
        <AppBar sx={{ position: 'relative', height: '64px' }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={handleHelpClose}
              aria-label="close"
            >
              <CloseRoundedIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              SQL container extension guide
            </Typography>
          </Toolbar>
        </AppBar>
        <Stack divider={<Divider flexItem />} spacing={1} sx={{ m: 2}}>
          <Stack spacing={1}>
            <Typography variant="h3">Overview</Typography>
            <List>
              <ListItem>Create new SQL containers</ListItem>
              <ListItem>Create new databases</ListItem>
              <ListItem>Connect to SQL</ListItem>
              <ListItem>Start, stop, and delete containers</ListItem>
              <ListItem>Notices</ListItem>
            </List>
          </Stack>
          <Stack spacing={1}>
            <Typography variant="h3">Create a new SQL container</Typography>
            <Typography>
              To create a new SQL container, fill in the form with the image, name, port, and password for the container. Then click the "Create" button. The container name must be unique from all other containers on your system and the port must not be in use. For running multiple SQL containers, consider using different ports such as 51433, 51434, etc.
            </Typography>
            <Typography>
              The password should be at least 8 characters long and contain characters from three of the following four sets: Uppercase letters, Lowercase letters, Base 10 digits, and Symbols. Consider using the password generator button in the Password field to create the password, which will automatically generate a 16 character password that containers Uppercase letters, Lowercase letters, and Base 10 digits.
            </Typography>
            <Alert severity="info">Use of the sa account and a password set at container creation is not suitable for production workloads. Environments setup for development use only.</Alert>
            <Typography>
              The new SQL container will use a persistent volume to store the database files, mapped to /var/opt/mssql. These files are stored in your user folder under ".sqlcontainers" in a folder named with a combination of the container name and a timestamp.
            </Typography>
          </Stack>
          <Stack spacing={1}>
            <Typography variant="h3">Create a new database</Typography>
            <Typography>
              A new SQL container is created with the default system databases, such as master. To create a new database, expand the container details and fill in the name of the database. Then click the "Create database" button. Each database should have a unique name within the container.
            </Typography>
          </Stack>
          <Stack spacing={1}>
            <Typography variant="h3">Connect to SQL</Typography>
            <Typography>
              A connection string is provided in the container list to facilitate connecting to SQL from different interfaces. The default connection string includes the custom container port and sa password. SQL Server Management Studio (SSMS), VS Code, or Azure Data Studio can be used to connect to the database. The extension includes both a button to copy the connection string to the clipboard and a button to open the connection in Azure Data Studio or the mssql extension in VS Code.
            </Typography>
            <Typography>
              The SQL containers extension includes an integrated command line interface (CLI) for basic querying and management of the SQL Server instance. To open the CLI, click the "Connect with sqlcmd" button in the database list in the container details.
            </Typography>
          </Stack>
          <Stack spacing={1}>
            <Typography variant="h3">Start, stop, and delete a container</Typography>
            <Typography>
              To start, stop, or delete a container, click the corresponding button in the container list. When a container is stopped, it will not be accessible until it is started again. When a container is started, the SQL Server engine automatically starts and the databases are available for connections.
            </Typography>
            <Typography>
              To delete a container, click the delete button. A confirmation dialog will appear with a choice of deleting the container or the container and the SQL data associated with the persisted volume. Deleting the data volume will remove all databases and other files associated with the SQL container from your machine.
            </Typography>
            <Alert severity="warning">The deletion action cannot be undone.</Alert>
          </Stack>
          <Stack spacing={1}>
            <Typography variant="h3">Notices</Typography>
            <Typography>
              The SQL containers extension is designed for local development and testing purposes. The extension does not support production workloads or high availability scenarios. The SQL Server instance is configured with the default settings and the SQL Server Express license.
            </Typography>
            <Typography>
              "SQL Server Express edition is the entry-level, free database and is ideal for learning and building desktop and small server data-driven applications." - https://learn.microsoft.com/sql/sql-server/editions-and-components-of-sql-server-2022#sql-server-editions
            </Typography>
            <Typography>
              The extension is provided as-is and without warranty. The extension is open-source and available on GitHub for contributions and issue reporting. The extension is not affiliated with Microsoft Corporation or Docker Inc. The extension is licensed under the MIT license.
            </Typography>
            <Typography>
              This extension collects anonymous usage data to help improve the extension. The data collected includes the number of containers created and instances of other actions taken with the extension. The data is used for improving the extension. To disable data collection, obtain the extension source from GitHub and build the extension locally with the Application Insights connection string removed from App.tsx.
            </Typography>
            </Stack>
        </Stack>
      </Dialog>
    </>
  );
}
