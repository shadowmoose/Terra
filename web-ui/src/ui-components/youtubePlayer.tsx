import React from 'react';
import '../styles/yt-player-style.scss';
import YouTube from 'react-youtube';
import {broadcast, isHost, netMode, NetworkMode} from "../game/net/peerconnection";
import YouTubeIcon from '@material-ui/icons/YouTube';
import {Button, Fab, Tooltip} from "@material-ui/core";
import {MediaStatusPacket} from "../game/net/packets/media-packets";
import GameController from "../game/controllers/game";
import {observer} from "mobx-react-lite";
import {InputDialog} from "./prompts";
import {observable} from "mobx";

const PLAYER_OPTS = {
    playerVars: {
        // https://developers.google.com/youtube/player_parameters
        autoplay: 1,
        mute: 0
    },
};

const playerConfig = observable.object({
    volume: 100,
    loop: true,
    shuffle: true
})


export const YoutubePlayerInterface = observer((props: {controller: GameController}) => {
    const [visible, setVisible] = React.useState(true);

    React.useMemo(() => {
        //TODO: Load playerConfig settings.
    }, []);

    const tools = (netMode.get() === NetworkMode.HOST && props.controller.mediaPlayer) ?
        <div className={'ytPlayerHostToolbar'}>
            <LoadPlaylistButton player={props.controller.mediaPlayer} />
        </div> : null;

    return <div style={{pointerEvents: 'auto'}} className={`ytPlayerIcon ${visible? 'visible':'hidden'}`}>
        <Tooltip
            title={"Media Controls"}
        >
            <Fab
                color="default"
                onClick={()=>{setVisible(!visible)}}
            >
                <YouTubeIcon className={`ytPlayerIconInner ${visible? 'visible':'hidden'}`} />
            </Fab>
        </Tooltip>

        <div className={`ytPlayerWrapper ${visible? 'visible':'hidden'}`}>
            {tools}
            <YoutubePlayer
                controller={props.controller}
                loop={playerConfig.loop}
                shuffle={playerConfig.shuffle}
                volume={playerConfig.volume}
            />
        </div>
    </div>;
});


export const YoutubePlayer = (props: {controller: GameController, loop: boolean, shuffle: boolean, volume: number}) => {
    const [player, setPlayer] = React.useState<any>(null);

    const getPlayerStatus = () => {
        const currentVideo: string = player.getVideoData().video_id;
        const currentTime: number = Math.floor(player.getCurrentTime());
        const playbackRate: number = player.getPlaybackRate();
        const paused: boolean = player.getPlayerState() === YouTube.PlayerState.PAUSED;

        return {
            currentVideo,
            currentTime,
            playbackRate,
            paused
        }
    };

    React.useEffect(() => {
        if (!player) return;

        props.controller.mediaPlayer = player;
        console.debug('Set player:', player);

        return () => {
            console.debug('Cleaning player up...');
            props.controller.mediaPlayer = null;
        }
    }, [player, props.controller.mediaPlayer]);

    const onReady = (event: any) => { // target, data
        setPlayer(event.target);
    }

    const onPlay = (event: any) => {
        console.debug('Video play:', getPlayerStatus());
        broadcast(new MediaStatusPacket().assign(getPlayerStatus()), true).catch(console.error);
    }

    const onPause = (event: any) => {
        console.debug('Video pause:', getPlayerStatus());
        broadcast(new MediaStatusPacket().assign(getPlayerStatus()), true).catch(console.error);
    }

    const onError = (event: any) => {
        event.target.nextVideo();
    }

    const onStateChange = (event: any) => {
        /*  BUFFERING: 3, CUED: 5, ENDED: 0, PAUSED: 2, PLAYING: 1, UNSTARTED: -1 */
        if (event.data === YouTube.PlayerState.CUED) {
            console.info('Video/Playlist Cued!', player, player.getVideoData());
            // Reference: https://developers.google.com/youtube/iframe_api_reference#onStateChange
            player.setLoop(props.loop);  // Loop the playlist.
            player.setShuffle(props.shuffle); // Can be toggled to shuffle/restore order.
            player.setVolume(props.volume); // 0-100.

            if (player.getPlaylist()) {
                player.playVideoAt(0);
            } else {
                player.playVideo();
            }
        }
    }

    return <div style={{pointerEvents: 'auto'}}>
        <YouTube
            // @ts-ignore
            opts={PLAYER_OPTS}
            onReady={onReady}
            onPlay={onPlay}
            onPause={onPause}
            onError={onError}
            onStateChange={onStateChange}
        />
    </div>;
};


export const LoadPlaylistButton = (props: {player: any}) => {
    const [prompt, needPrompt] = React.useState(false);

    const loadPlaylist = (input: string) => {
        needPrompt(false);
        if (!input) return;

        const parser = new URLSearchParams(input);
        let id = parser.get('list') || input;

        if (id.includes('=')) id = input.split('=')[1];

        props.player.cuePlaylist({
            list: id,
            listType: 'playlist',
            index: 0,
            startSeconds: 0
        });
    };

    return <div>
        <Button
            style={{color: 'rgba(25,160,7,0.94)'}}
            onClick={() => needPrompt(true)}
        >
            Load Playlist
        </Button>
        <InputDialog
            open={prompt}
            title={'Enter a Playlist'}
            body={'Enter a YouTube Playlist:'}
            tooltip={'Playlist URL'}
            onSubmit={loadPlaylist}
            onCancel={() => needPrompt(false)}
            acceptText={'Load'}
        />
    </div>
}
