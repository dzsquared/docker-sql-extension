import { osName } from 'react-device-detect';
import { IconButton, Tooltip } from '@mui/material';
import { DvrRounded } from '@mui/icons-material';
import { copyToClipboard } from './ContainerList';

// copies the password to the clipboard, then opens the connectionURI
const openADS = (connectionURI: string, saPassword: string) => {
    copyToClipboard(saPassword);
    window.location.href = connectionURI;
}

const openVSC = (connectionURI: string, saPassword: string) => {
    copyToClipboard(saPassword);
    window.location.href = connectionURI;
}

export const ConnectionOptions = ({ container, trackEvent }) => {

if (osName !== "Windows") {
    return (
        <>
            <Tooltip title="Connect in Azure Data Studio">
                <IconButton size="small" aria-label='connect' disabled={!(container.Status === "running")}
                    onClick={() => {
                        trackEvent('OpenADS', { containerId: container.Id });
                        openADS(container.adsConnectionURI(), container.SApassword);
                    }}>
                    <DvrRounded />
                </IconButton>
            </Tooltip>
            <Tooltip title="Connect in VS Code">
                <IconButton size="small" aria-label='connect' disabled={!(container.Status === "running")}
                    onClick={() => {
                        trackEvent('OpenVSC', { containerId: container.Id });
                        openVSC(container.vscConnectionURI(), container.SApassword);
                    }}>
                    <DvrRounded />
                </IconButton>
            </Tooltip>
        </>
    );
} else {
    return (
        <>
        <Tooltip title="Connect in Azure Data Studio">
            <IconButton size="small" aria-label='connect' disabled={!(container.Status === "running")}
                onClick={() => {
                    trackEvent('OpenADS', { containerId: container.Id });
                    openADS(container.adsConnectionURI(), container.SApassword);
                }}>
                <DvrRounded />
            </IconButton>
        </Tooltip>
            <Tooltip title="Connect in VS Code">
                <IconButton size="small" aria-label='connect' disabled={!(container.Status === "running")}
                    onClick={() => {
                        trackEvent('OpenVSC', { containerId: container.Id });
                        openVSC(container.vscConnectionURI(), container.SApassword);
                    }}>
                    <DvrRounded />
                </IconButton>
            </Tooltip>
        </>
    );
}
}