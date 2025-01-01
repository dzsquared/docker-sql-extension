import React from 'react';
import { Container } from '@mui/system';
import { Alert, Button, Card, CardActions, CardContent, FormControl, FormHelperText, Grid2 as Grid, IconButton, InputAdornment, InputLabel, LinearProgress, MenuItem, OutlinedInput, Select, Typography } from '@mui/material';
import { VisibilityRounded, VisibilityOffRounded, RefreshRounded, AddCircleRounded, OpenInNewRounded } from "@mui/icons-material";

import { SqlContainer } from '../models/SqlContainer';
import { useDockerDesktopClient } from '../App';

export const NewContainer = ({ onChangeForm, containerConfig, createContainer, imageList, createResponse, currentContainers }) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const handleClickShowPassword = () => setShowPassword((show) => !show);
    const handleMouseDownPassword = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    };

    const [sapassword, setSAPassword] = React.useState(null);
    const [sapasswordError, setsapasswordError] = React.useState(null);
    const [portError, setPortError] = React.useState(null);
    const [sqlImage, setSqlImage] = React.useState(null);
    const [creationProgress, setCreationProgress] = React.useState(false);

    const openEULA = () => {
        const ddClient = useDockerDesktopClient();
        ddClient.host.openExternal("https://www.microsoft.com/useterms#areaheading-uid6738233");
    }

    const updateImageSelection = () => {
        if (containerConfig?.image) {
            setSqlImage(containerConfig.image);
        }
    }

    const comparePortList = (currentContainers: SqlContainer[], portValue: number) => {
        var portList: number[] = [];
        var isFound = false;
        currentContainers.forEach((container) => {
            portList.push(container.Port1433);
            if (container.Port1433 === portValue) {
                isFound = true;
            }
        });
        return isFound;
    };


    const validateSAPasswordError = (key: string) => {
        setsapasswordError(null);
        if (key.length < 8) {
            setsapasswordError("Please enter a valid SA password");
        } else {
            setSAPassword(key);
        }
    };

    const validatePortNumber = (portValue : number) => {
        setPortError(null);
        if (portValue < 1024 || portValue > 65535) {
            setPortError("Please enter a valid port number between 1024 and 65535");
        }
        if (comparePortList(currentContainers, portValue)) {
            setPortError("Port number already in use on a running container");
        }
        
    }

    const creatingContainer = (createContainer) => {
        console.log('waiting for the creation to finish');
        setCreationProgress(true);

        createContainer();
    }


    const CreationResponse = () => {
        if (createResponse) {
            if (createResponse.status === 201) {
                return (
                    <Alert severity="success">Container created successfully</Alert>
                )
            } else if (createResponse.status === 500 || createResponse.status === 400) {
                return (
                    <Alert severity="error">{createResponse}</Alert>
                )
            } else if (creationProgress) {
                    return (
                        <Alert severity="info">
                            Creating container...
                            <LinearProgress />
                        </Alert>
                    )
            } else {
                return null;
            }
        }
    };

    const generatePassword = () => {
        const length = 16;
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let lowerCase = false;
        let upperCase = false;
        let number = false;
        let password = "";
        let i = 0;
        while (i < length || !lowerCase || !upperCase || !number) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            if (randomIndex < 26) {
                lowerCase = true;
            } else if (randomIndex < 52) {
                upperCase = true;
            } else {
                number = true;
            }
            password += charset[randomIndex];
            i++;
        }
        setSAPassword(password);
        // Set the value of the container-password field
        const passwordField = document.getElementById('container-password') as HTMLInputElement;
        if (passwordField) {
            passwordField.value = password;
        }
        validateSAPasswordError(password);
        // Trigger the form change with the generated password
        const event = {
            target: {
                name: "container-password",
                value: password
            }
        };
        onChangeForm(event);
    };

    return (
        <Container maxWidth="xl">
            <Card variant="outlined" sx={{ display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flex: '1 0 auto',  pb: '0px' }}>
                        <Typography variant="h3" >Create a SQL container</Typography>
                        <Grid container spacing={1} columnSpacing={1} >
                            <Grid size={3}>
                                <FormControl sx={{ width: '90%' }}>
                                    <InputLabel htmlFor="container-image">Image</InputLabel>
                                    <Select sx={{ paddingTop:'8.5px', paddingBottom:'8.5px' }}
                                        id="container-image"
                                        name="container-image"
                                        label="Image"
                                        value={containerConfig?.image || ""}
                                        onChange={(e) => {
                                            onChangeForm(e)
                                            updateImageSelection();
                                        }}
                                    >
                                        {imageList.map((image) => {
                                            var imageLabel = image.replace("mcr.microsoft.com/", "");
                                            return (
                                                <MenuItem key={image} value={image}>{imageLabel}</MenuItem>
                                            );
                                        })
                                        }
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={3}>
                                <FormControl sx={{ width: '90%' }}>
                                    <InputLabel htmlFor="container-name">Container name</InputLabel>
                                    <OutlinedInput
                                        id="container-name"
                                        name="container-name"
                                        label="Container name"
                                        type="text"
                                        placeholder=""
                                        onChange={(e) => onChangeForm(e)}
                                    />
                                </FormControl>
                            </Grid>
                            <Grid size={2}>
                                <FormControl sx={{ width: '90%' }}>
                                    <InputLabel htmlFor="container-port">Port</InputLabel>
                                    <OutlinedInput
                                        id="container-port"
                                        name="container-port"
                                        label="Port"
                                        type="number"
                                        placeholder="1433"
                                        onChange={(e) => {
                                            validatePortNumber(Number(e.target.value));
                                            onChangeForm(e);
                                        }}
                                        error={!!portError}
                                    />
                                    <FormHelperText>{portError ? portError : ""}</FormHelperText>
                                </FormControl>
                            </Grid>
                            <Grid size={3}>
                                <FormControl sx={{ width: '90%' }}>
                                    <InputLabel htmlFor="container-password">Password (sa)</InputLabel>
                                    <OutlinedInput
                                        id="container-password"
                                        name="container-password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder=""
                                        error={!!sapasswordError}
                                        onChange={(e) => {
                                            validateSAPasswordError(e.target.value);
                                            onChangeForm(e);
                                        }}
                                        label="Password (sa)"
                                        endAdornment={
                                            <InputAdornment position="end" sx={{ pr: '10px' }}>
                                                <IconButton
                                                    aria-label="toggle password visibility"
                                                    sx={{ p: '2px'}}
                                                    onClick={handleClickShowPassword}
                                                    onMouseDown={handleMouseDownPassword}
                                                >
                                                    {showPassword ? <VisibilityOffRounded /> : <VisibilityRounded />}
                                                </IconButton>
                                                <IconButton
                                                    aria-label="generate new password"
                                                    sx={{ p: '2px'}}
                                                    onClick={generatePassword}
                                                    // onMouseDown={handleMouseDownPassword}
                                                >
                                                    <RefreshRounded />
                                                </IconButton>
                                            </InputAdornment>
                                        }
                                    />
                                    <FormHelperText>{sapasswordError ? sapasswordError : ""}</FormHelperText>
                                </FormControl>
                            </Grid>
                            <Grid size={1}>
                                <Button 
                                    variant="contained" 
                                    color="success" 
                                    sx={{ p: '8px', m: '8px' }}
                                    disabled={creationProgress}
                                    title="Create container"
                                    onClick={() => creatingContainer(createContainer)}>
                                        <AddCircleRounded />
                                </Button>
                            </Grid>
                        </Grid>
                    </CardContent>
                    <CardActions sx={{ pt: '0px' }}>
                        <Typography>Creating a container invokes acceptance of the </Typography><Button variant="text" endIcon={<OpenInNewRounded />} sx={{padding:'4px'}} onClick={() => openEULA()}>EULA for SQL Server Express</Button>.
                    </CardActions>
                </Card>
            <CreationResponse />
        </Container>
    );
};