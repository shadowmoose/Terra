import React from 'react';
import '../styles/yt-player-style.scss';
import YouTube from 'react-youtube';
import {broadcast, netMode, NetworkMode, isHost} from "../game/net/peerconnection";
import YouTubeIcon from '@material-ui/icons/YouTube';
import ShuffleIcon from '@material-ui/icons/Shuffle';
import {Button, Fab, IconButton, Tooltip} from "@material-ui/core";
import {MediaRequestPacket, MediaStatusPacket} from "../game/net/packets/media-packets";
import {observer} from "mobx-react-lite";
import {InputDialog} from "./prompts";
import {observable} from "mobx";
import {Meta, metadata} from "../game/db/metadata-db";

const PLAYER_OPTS = {
    playerVars: {
        // https://developers.google.com/youtube/player_parameters
        autoplay: 1,
        mute: 0
    },
};

interface PlayerConfig {
    volume: number;
    loop: boolean;
    shuffle: boolean;
}

const config: PlayerConfig = observable.object({
    volume: 100,
    loop: true,
    shuffle: true
});

function saveConf() {
    metadata.store(Meta.PLAYER_CONFIG, config).catch(console.error);
}

/**
 * The current player. There should only ever be one at a time. May be null until initialized.
 */
export let player: any = null;

/**
 * Get a summary of the currently-playing media, if any is available.
 */
export const getPlayerStatus = (): Partial<MediaStatusPacket>|null => {
    if (!player) return null;

    const currentVideo: string = player.getVideoData().video_id;
    const currentTime: number = Math.floor(player.getCurrentTime());
    const playbackRate: number = player.getPlaybackRate();
    const paused: boolean = player.getPlayerState() === YouTube.PlayerState.PAUSED;

    if (!currentVideo) return null;

    return {
        currentVideo,
        currentTime,
        playbackRate,
        paused
    }
};


export const YoutubePlayerInterface = observer(() => {
    const [visible, setVisible] = React.useState(true);

    React.useMemo(() => {
        metadata.get(Meta.PLAYER_CONFIG).then(async (res: PlayerConfig|null) => {
            if (res) {
                Object.assign(config, res);
            }
        })
    }, []);

    const tools = (netMode.get() === NetworkMode.HOST && player) ?
        <div className={'ytPlayerHostToolbar'}>
            <LoadPlaylistButton player={player} />
            <ShuffleButton player={player}/>
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
                loop={config.loop}
                shuffle={config.shuffle}
                volume={config.volume}
            />
        </div>
    </div>;
});


export const YoutubePlayer = (props: {loop: boolean, shuffle: boolean, volume: number}) => {
    const [mediaPlayer, setPlayer] = React.useState<any>(null);

    React.useEffect(() => {
        if (!mediaPlayer) return;

        player = mediaPlayer;

        if (!isHost()) broadcast(new MediaRequestPacket(), false).catch(console.error);

        const timer = setInterval(() => {
            // Periodically poll for a new user-set volume, and save the new result.
            const v = mediaPlayer.getVolume();
            if (mediaPlayer.getPlayerState() === YouTube.PlayerState.PLAYING && v !== config.volume) {
                config.volume = v;
                saveConf();
            }
        }, 15000);

        return () => {
            player = null;
            clearInterval(timer);
        }
    }, [mediaPlayer]);

    const onReady = (event: any) => { // target, data
        setPlayer(event.target);
    }

    const onPlay = () => {
        const stat = getPlayerStatus();
        if (stat) {
            console.debug('Video play:', getPlayerStatus());
            broadcast(new MediaStatusPacket().assign(stat), true).catch(console.error);
        }
    }

    const onPause = () => {
        const stat = getPlayerStatus();
        if (stat) {
            console.debug('Video pause:', getPlayerStatus());
            broadcast(new MediaStatusPacket().assign(stat), true).catch(console.error);
        }
    }

    const onError = (event: any) => {
        event.target.nextVideo();
    }

    const onStateChange = (event: any) => {
        /*  BUFFERING: 3, CUED: 5, ENDED: 0, PAUSED: 2, PLAYING: 1, UNSTARTED: -1 */
        if (event.data === YouTube.PlayerState.CUED) {
            console.info('Video/Playlist Cued!', mediaPlayer, mediaPlayer.getVideoData());
            // Reference: https://developers.google.com/youtube/iframe_api_reference#onStateChange
            mediaPlayer.setLoop(props.loop);  // Loop the playlist.
            mediaPlayer.setShuffle(props.shuffle); // Can be toggled to shuffle/restore order.
            mediaPlayer.setVolume(props.volume); // 0-100.

            if (mediaPlayer.getPlaylist()) {
                mediaPlayer.playVideoAt(0);
            } else {
                mediaPlayer.playVideo();
            }
        }
    }

    return <div style={{pointerEvents: 'auto'}}>
        <YouTube
            // @ts-ignore
            opts={PLAYER_OPTS}
            id={'yt-player'}
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

    return <div className={'ytPlayerPlaylistButton'}>
        <Button
            style={{color: 'rgba(25,160,7,0.94)', height: '100%'}}
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


export const ShuffleButton = observer((props: {player: any}) => {
    const toggle = () => {
        config.shuffle = !config.shuffle;
        props.player.setShuffle(config.shuffle);

        saveConf();
    }

    return <Tooltip title={"Shuffle"}>
        <IconButton
            children={<ShuffleIcon className={`ytPlayerShuffleIcon ${config.shuffle ? 'active': 'inactive'}`}/>}
            onClick={toggle}
        />
    </Tooltip>
});
