import {observable} from "mobx";
import notifications from "../../ui-components/notifications";


export interface PendingUser {
    username: string;
    keyCode: string;
    approve: Function;
    reject: Function;
}

export default class Lobby {
    @observable public readonly pendingLogins: PendingUser[] = [];
    @observable public myName: string = '';
    private readonly blacklist: Set<String> = new Set();

    private notify(title: string, body: string, iconURL: string='') {
        Notification.requestPermission().then(function(result) {
            if (result === 'granted') {
                new Notification(title, {
                    body,
                    icon: iconURL // TODO: Path to alert icon image.
                });
            }
        });
    }

    /**
     * Adds the given login attempt to the pending list,
     * and returns a Promise that will either resolve or reject eventually at the Hosts' discretion.
     * @param username
     * @param keyCode
     */
    public async addPendingLogin(username: string, keyCode: string) {
        return new Promise((approve, reject) => {
            const existing = Array.from(this.pendingLogins).find(pe => pe.keyCode === keyCode);
            const pending = { username, keyCode, approve, reject };

            if (existing) {
                this.removePending(existing);
            }
            this.pendingLogins.push(pending);

            if (!this.blacklist.has(keyCode)) {
                notifications.warning(`Unknown device (${keyCode}) wants to join as "${username}".`, {});
                this.notify('New Unknown User', `Unknown device (${keyCode}) wants to join as "${username}".`);
            }
        });
    }

    public approveUser(user: PendingUser) {
        user.approve(true);
        notifications.success(`Approved user "${user.username}".`)
        this.removePending(user);
    }

    public rejectUser(user: PendingUser) {
        user.reject(false);
        notifications.error(`Rejected device (${user.keyCode}).`)
        this.removePending(user);
        this.blacklist.add(user.keyCode);
    }

    private removePending(user: PendingUser) {
        const idx = this.pendingLogins.findIndex(u => u.keyCode === user.keyCode);
        if (idx >= 0) {
            this.pendingLogins.splice(idx, 1);
        }
    }
}
