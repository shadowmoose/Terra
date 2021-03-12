import {db} from './database';

export interface UserData {
    id: number;
    username: string;
    keyCodes: string[];
    lastSeen: number;
}


export async function addNewUser(user: Partial<UserData>): Promise<UserData> {
    const data = {
        id: 0,
        username: '',
        keyCodes: [],
        ...user,
        lastSeen: new Date().getTime()
    };
    await db.users.put(data);
    return data;
}

export async function updateUser(user: UserData): Promise<number> {
    return db.users.update(user.id, user);
}

export async function getUser(username: string): Promise<UserData|null> {
    return db.users.where({username}).first();
}

/**
 * Checks if the given User code matches an existing username.
 * If so, also updates the lastSeen time of the user.
 * @param userName
 * @param keyCode
 */
export async function checkUserCredentials(userName: string, keyCode: string): Promise<UserData> {
    const match = await db.users.where({username: userName, keyCodes: keyCode}).first();

    if (match) {
        match.lastSeen = new Date().getTime();
        await updateUser(match);
    }

    return match;
}
