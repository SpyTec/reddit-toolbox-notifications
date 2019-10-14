export interface IUserNotes {
    ver: number;
    constants: {
        users: string[];
        warnings: string[];
    }
    blob: string|object; // Base64 format and then encoded with zlib
}