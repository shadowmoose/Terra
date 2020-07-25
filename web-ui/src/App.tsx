import React from 'react';
import './styles/App.scss';
import './styles/canvas-style.scss';
import GameController from "./game/controllers/game";
import useMediaQuery from '@material-ui/core/useMediaQuery';
import Backdrop from '@material-ui/core/Backdrop';
import CircularProgress from '@material-ui/core/CircularProgress';
import {Typography} from "@material-ui/core";
import ControlMenu from "./ui-components/controlMenu";
import {observer} from "mobx-react-lite";
import ConnectionOverlay from "./ui-components/connectionOverlay";
import {SnackbarProvider} from 'notistack';
import * as connection from "./game/net/peerconnection";
import {NetworkMode} from "./game/net/peerconnection";
import {SnackbarUtilsConfigurator} from "./ui-components/notifications";
import {Meta, metadata} from './game/db/metadata-db';
import {CampaignSelector} from "./ui-components/campaignSelector";
import {BoardSelector} from "./ui-components/boardSelector";
import {BoardSaveButton} from "./ui-components/boardSaveButton";
import {InputDialog} from "./ui-components/prompts";
import {YoutubePlayerInterface} from "./ui-components/youtubePlayer";


if (!('PointerEvent' in window)) {
    alert('This browser does not support pointer events - please use a different one!');
}

const controller = new GameController();

if (process.env.NODE_ENV !== 'development') {
    console.info('Shutting the console up for non-dev build.');
    function noop() {}
    console.debug = noop;
    console.log = noop;
    console.info = noop;
}

const App = observer(() => {
    const desktop = useMediaQuery('(min-width:900px)');
    const [needName, setNeedName] = React.useState(true);
    const setName = async (name: string) => {
        if (name && name.length) {
            setNeedName(false);
            await metadata.store(Meta.USERNAME, name);
            await controller.start();
        } else {
            window.location.reload();
        }
    }
    React.useMemo(() => {
        // Check initially to see if we already have a username stored:
        metadata.get(Meta.USERNAME).then(async (name: string) => {
            if (name && name.length) {
               setNeedName(false);
               await controller.start();
            }
        })
    }, []);

    let content: JSX.Element|null = null;

    if (needName) {
        content = <InputDialog
            open={needName}
            title='Choose a Name'
            body='Enter the name you want to go by:'
            tooltip={'Name'}
            onSubmit={setName}
            onCancel={setName}
        />;
    } else if (!controller.ready && connection.netMode.get() === NetworkMode.UNKNOWN) {
        content = <Backdrop open={true} transitionDuration={0}>
            <Typography variant="h1" component="h2" gutterBottom>
                Loading <CircularProgress color="inherit" />
            </Typography>
        </Backdrop>;
    } else if (controller.isNetworkReady) {
        content = <ControlMenu controller={controller} forMobile={!desktop}/>
    } else if (!controller.isNetworkReady) {
        content = <ConnectionOverlay controller={controller} />;
    }

    return (
        <SnackbarProvider maxSnack={5}>
            <SnackbarUtilsConfigurator />
            <div className="App noMouse">
                <div style={{
                    display: 'flex',
                    pointerEvents: 'none',
                    flexDirection: 'row',
                    position: 'fixed',
                    top: '10px',
                    left: '10px'
                }}>
                    <CampaignSelector controller={controller}/>
                    <BoardSelector controller={controller}/>
                    <BoardSaveButton controller={controller} />
                    <YoutubePlayerInterface />
                </div>

                {content}
            </div>
        </SnackbarProvider>
    )
});

export default App;
