import * as React from 'react';
import { AppBar, Box, Button, Chip, CircularProgress, Collapse, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, IconButton, InputLabel, List, ListItem, ListItemIcon, ListItemText, OutlinedInput, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Toolbar, Tooltip, Typography } from '@mui/material';
import { AddCircleRounded, ArticleRounded, ContentCopyRounded, StopRounded, PlayArrowRounded, KeyboardArrowUpRounded, KeyboardArrowDownRounded, TerminalRounded, CloseRounded, DeleteRounded } from "@mui/icons-material";

import { SqlContainer } from '../models/SqlContainer';
import { ConnectionOptions } from './ConnectionOptions';
import { useDockerDesktopClient } from '../App';

export const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    const ddClient = useDockerDesktopClient();
    ddClient.desktopUI.toast.success("Password copied to clipboard");
}

const navigateToContainer = (containerId: string) => {
    const ddClient = useDockerDesktopClient();
    ddClient.desktopUI.navigate.viewContainerLogs(containerId);
}

var ContainerStatus = ({ status }) => {
    if (status === "running") {
        return (
            <Chip label="Running" color="success" />
        );
    }
    else {  // stopped
        return (
            <Chip label="Stopped" color="error" />
        );
    }
}

var ContainerManager = ({ container, startContainer, stopContainer }) => {
    // if stopped, return start button else stop button
    if (container.Status === "running") {
        return (
            <Tooltip title="Stop">
                <IconButton size="small" aria-label='stop' onClick={() => stopContainer(container.Id)}>
                    <StopRounded />
                </IconButton>
            </Tooltip>
        );
    } else {
        return (
            <Tooltip title="Start">
                <IconButton size="small" aria-label='start' onClick={() => startContainer(container.Id)}>
                    <PlayArrowRounded />
                </IconButton>
            </Tooltip>
        );
    }
}

var DatabaseList = ({ databases, handleConnectionOpen }) => {
    if (!databases) {
        return (
            <>
                <Typography variant="h4">Databases</Typography>
                <List>
                    <ListItem><CircularProgress /></ListItem>
                </List>
            </>
        )
    }

    if (databases.length === 0) {
        return <></>;
    }

    return (
        <>
            <Typography variant="h4">Databases</Typography>
            <List>
                {databases.map((database) => (
                    <ListItem key={database.Id} sx={{ p: '0px' }}>
                        <ListItemIcon>
                            <Tooltip title="Connect with sqlcmd">
                            <TerminalRounded fontSize="small" onClick={() => handleConnectionOpen(database.Name)} />
                            </Tooltip>
                        </ListItemIcon>
                        <ListItemText primary={database.Name} />
                    </ListItem>
                ))}
            </List>
        </>
    )
}

var ContainerRow = ({ container, startContainer, stopContainer, deleteContainer, expandContainer, onChangeForm, createDatabase, trackEvent }) => {
    const [open, setOpen] = React.useState(false);
    const [connectionOpen, setConnectionOpen] = React.useState(false);
    const [ready, setReady] = React.useState(false);
    const [unavailable, setUnavailable] = React.useState(false);
    const [deleteOpen, setDeleteOpen] = React.useState(false);

    const handleDeleteClickOpen = () => {
        setDeleteOpen(true);
    };
    
    const handleDeleteClose = (optionPicked) => {
        if (optionPicked === 'container') {
            deleteContainer(container.Id, false);
        } else if (optionPicked === 'both') {
            deleteContainer(container.Id, true);
        }
        setDeleteOpen(false);
    };
    

    const handleConnectionOpen = async (databaseName: string) => {
        trackEvent('OpenSqlCli', { containerId: container.Id });
        const ddClient = useDockerDesktopClient();
        await ddClient.extension.vm?.service?.post('/startConnection', { SApassword: container.SApassword, Port: String(container.Port1433), Databasename: databaseName });

        let retries = 10;
        let timer = setInterval(async () => {
            if (retries == 0) {
                clearInterval(timer);
                setUnavailable(true);
            }

            try {
                const result = await ddClient.extension.vm?.service?.get('/ready');

                if (result !== null && result !== undefined && Boolean(result) == true) {
                    setReady(() => true);
                    clearInterval(timer);
                }
            } catch (error) {
                console.log('error when checking sqlcl status', error);
            }
            retries--;
        }, 1000);


        setConnectionOpen(true);
    };

    const handleConnectionClose = async () => {
        const ddClient = useDockerDesktopClient();
        await ddClient.extension.vm?.service?.post('/stopConnection', { SApassword: container.SApassword, Port: String(container.Port1433) });
        setConnectionOpen(false);
    };

    const createDatabaseCall = async () => {
        await createDatabase(container.Id);
    }

    var openDetails = () => {
        if (!open) {
            expandContainer(container);
        }
        setOpen(!open);
    }

    const handleContainerStop = () => {
        setOpen(false);
        stopContainer(container.Id);
    }


    return (
        <>
            <TableRow key={container.Id} sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell><ContainerStatus status={container.Status} /></TableCell>
                <TableCell>{container.Name}</TableCell>
                <TableCell>{container.displayImage()}</TableCell>
                <TableCell>{container.displayId()}</TableCell>
                <TableCell>{container.Port1433}</TableCell>
                <TableCell>
                    <ContainerManager container={container} startContainer={startContainer} stopContainer={handleContainerStop} />
                    <Tooltip title="Delete">
                        <IconButton size="small" aria-label='delete' onClick={ handleDeleteClickOpen}>
                            <DeleteRounded />
                        </IconButton>
                    </Tooltip>
                    <Dialog
                        open={deleteOpen}
                        onClose={() => handleDeleteClose('cancel')}
                        aria-labelledby="alert-dialog-title"
                        aria-describedby="alert-dialog-description"
                    >
                        <DialogTitle id="alert-dialog-title">
                            Delete container {container.Name}?
                        </DialogTitle>
                        <DialogContent>
                            <DialogContentText id="alert-dialog-description">
                                Because the database files are stored in a mounted volume, deleting only the container will leave the database files in the .sqlcontainer folder unless those files are manually deleted later.
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => handleDeleteClose('cancel')} variant="outlined">Cancel</Button>
                            <Button onClick={() => handleDeleteClose('container')} color="error">Delete container forever</Button>
                            <Button onClick={() => handleDeleteClose('both')} color="error">Delete container+data forever</Button>
                        </DialogActions>
                    </Dialog>
                </TableCell>
                <TableCell>
                    <div>
                        <Tooltip title="Copy Connection String">
                            <IconButton size="small" aria-label='copy' onClick={() => copyToClipboard(container.connectionString())}>
                                <ContentCopyRounded />
                            </IconButton>
                        </Tooltip>
                        <ConnectionOptions container={container} trackEvent={trackEvent} />
                        <Tooltip title="Container logs">
                            <IconButton size="small" aria-label='logs' onClick={() => {
                                trackEvent('ViewLogs', { containerId: container.Id });
                                navigateToContainer(container.Id);
                            }} >
                                <ArticleRounded />
                            </IconButton>
                        </Tooltip>
                    </div>
                </TableCell>
                <TableCell>
                    <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => openDetails()}
                        disabled={!(container.Status === "running")}
                    >
                        {open ? <KeyboardArrowUpRounded /> : <KeyboardArrowDownRounded />}
                    </IconButton>
                </TableCell>
            </TableRow>
                <TableRow key={container.Id + "b"}>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={1} />
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={2}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                            <Stack spacing={0}>
                                <Dialog
                                    fullScreen
                                    open={connectionOpen}
                                    onClose={handleConnectionClose}
                                >
                                    <AppBar sx={{ position: 'relative',  height: '64px' }}>
                                        <Toolbar>
                                            <IconButton
                                                edge="start"
                                                color="inherit"
                                                onClick={handleConnectionClose}
                                                aria-label="close"
                                            >
                                                <CloseRounded />
                                            </IconButton>
                                            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                                                sqlcmd (enter query and execute with GO)
                                            </Typography>
                                        </Toolbar>
                                    </AppBar>
                                    <Box display="flex" flex={1}>
                                        {!ready && !unavailable && <CircularProgress />}
                                        {unavailable && <Typography>Service is unavailable</Typography>}
                                        {ready && (
                                            <iframe src='http://localhost:9890/' width='100%' height='100%' />
                                        )}
                                    </Box>
                                </Dialog>
                                <DatabaseList databases={container.Databases} handleConnectionOpen={handleConnectionOpen} />
                            </Stack>
                        </Box>
                    </Collapse>
                    </TableCell>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={5}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Stack spacing={0}>
                            <Typography gutterBottom sx={{ fontFamily: 'Roboto Mono, monospace', fontSize: '0.8rem' }}>
                                {container.connectionString(true)}
                                <Tooltip title="Copy connection string">
                                    <IconButton size="small" aria-label='copy' onClick={() => copyToClipboard(container.connectionString())}>
                                        <ContentCopyRounded fontSize="inherit" />
                                    </IconButton>
                                </Tooltip>
                            </Typography>
                            <Stack direction={'row'} spacing={1}>
                                <FormControl sx={{ width: '40ch' }} size="small">
                                    <InputLabel htmlFor="database-name">new database</InputLabel>
                                    <OutlinedInput
                                        id="database-name"
                                        name="database-name"
                                        label="Database name"
                                        type="text"
                                        placeholder=""
                                        onChange={(e) => onChangeForm(e)}
                                    />
                                </FormControl>
                                <Button
                                    variant="contained"
                                    color="success"
                                    sx={{ p: '8px', m: '5px' }}
                                    title="Create database"
                                    onClick={() => createDatabaseCall()}
                                >
                                    <AddCircleRounded fontSize="small" />
                                </Button>
                            </Stack>
                        </Stack>
                        </Collapse>
                    </TableCell>
                </TableRow>
        </>
    )
}

export const ContainerList = ({ currentContainers, currentDatabases, startContainer, stopContainer, deleteContainer, expandContainer, onChangeForm, createDatabase, trackEvent }) => {

    var containerlist: SqlContainer[] = [];
    if (currentContainers) {
        containerlist = currentContainers;
    }
    currentDatabases?.forEach((databaseContainer) => {
        containerlist.forEach((container) => {
            if (container.Id === databaseContainer.ContainerId) {
                container.Databases = databaseContainer.Databases;
            }
        });
    });

    return (
        <TableContainer>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell></TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Image</TableCell>
                        <TableCell>Id</TableCell>
                        <TableCell>Port:1433</TableCell>
                        <TableCell>Control</TableCell>
                        <TableCell>Connect</TableCell>
                        <TableCell>Details</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {containerlist.map((container) => (
                        <ContainerRow container={container} key={container.Id} startContainer={startContainer} stopContainer={stopContainer} deleteContainer={deleteContainer} expandContainer={expandContainer} onChangeForm={onChangeForm} createDatabase={createDatabase} trackEvent={trackEvent} />
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
