/**
 * Media Services Module Index
 * 
 * Exports media-related functionality for signed URLs and streaming.
 */

// Signed Link Service
export {
    generateSignedLink,
    generateProxyToken,
    verifyProxyToken,
    getFileStream,
    isValidProvider,
    isValidFileId,
    signedLinksTotal,
    streamRequestsTotal,
    type SignedLinkParams,
    type SignedLinkResult,
    type StreamTokenPayload,
    type MediaProvider,
} from "./signedLink";

// Drive Client
export {
    getDriveFile,
    getDriveFileUrl,
    streamDriveFile,
    streamDriveFileRange,
} from "./driveClient";

// Graph Client (OneDrive)
export {
    getOneDriveItem,
    getOneDriveFileUrl,
    createSharingLink,
    streamOneDriveFile,
    streamOneDriveFileRange,
} from "./graphClient";

// Local File Service
export {
    resolveFilePath,
    localFileExists,
    getLocalFileInfo,
    streamLocalFile,
    streamLocalFileRange,
    saveLocalFile,
    deleteLocalFile,
    listLocalFiles,
} from "./localFileService";
