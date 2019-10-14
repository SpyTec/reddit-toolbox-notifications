import * as Snoowrap from "snoowrap";
import * as pako from "pako";
import * as _ from "lodash";
import {EventEmitter} from "events";
import { TB_MIN_NOTES_VERSION, TB_MAX_NOTES_VERSION } from "./constants";
import { IUserNotes } from "./types/IUserNotes";

export default class ToolboxNotifications extends EventEmitter {
    private interval: NodeJS.Timeout;
    private lastNotes: IUserNotes|null = null;
    private snoowrap: Snoowrap;

    constructor({snoowrap}: {snoowrap: Snoowrap}) {
        // get settings in param and apply it to a var
        // settings shoudl use an interface
        super();
        this.interval = this.run();
        this.snoowrap = snoowrap;
    }

    start() {
        this.interval = this.run();
    }
    
    end() {
        clearInterval(this.interval);
        this.emit("end");
    }

    private run(): NodeJS.Timeout {
        let wikiPage: Snoowrap.WikiPage = this.snoowrap.getSubreddit('EliteDangerous').getWikiPage('usernotes');
        return setInterval(async () => {
            try {
                // @ts-ignore
                wikiPage = await wikiPage.refresh();

                // @ts-ignore
                const userNotes: IUserNotes = JSON.parse(wikiPage.data.content_md);
                // Use a Buffer to convert the data from a base64 string to a binary string
                const binaryData = Buffer.from(userNotes.blob as string, 'base64').toString('binary');
                // Use pako to inflate/decompress the binary data into a JSON string
                const jsonString = pako.inflate(binaryData, {to: 'string'});
                // Parse the string as JSON to get our final users object
                const usersObject = JSON.parse(jsonString);
                userNotes.blob = usersObject;

                // Make sure we have a valid notes version and only send events if we have a previous notes to compare with
                if (this.isNotesValidVersion(userNotes.ver) && this.lastNotes) {
                    const userDiff = _.omit(this.lastNotes.constants.users, userNotes.constants.users);
                    if (userDiff) {
                        console.log("new user", userDiff);
                    }

                    const noteWarningsDiff = _.omit(this.lastNotes.constants.warnings, userNotes.constants.warnings);
                    if (noteWarningsDiff) {
                        console.log("new warning type", noteWarningsDiff);
                    }

                    const userObjectDiff = _.omit(this.lastNotes.blob as object, usersObject);
                    if (userObjectDiff) {
                        console.log("new note added", userObjectDiff);
                    }
                    console.log(userNotes.constants.users[0])
                }
                this.lastNotes = userNotes
            } catch(e) {
                console.warn(e)
            }
        }, 60000);
    }

    private isNotesValidVersion(ver: number): boolean {
        return ver < TB_MIN_NOTES_VERSION || ver > TB_MAX_NOTES_VERSION;
    }
}