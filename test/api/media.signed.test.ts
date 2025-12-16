/**
 * Media Signed Link Endpoint Tests
 * 
 * Tests for GET /api/media/play and /media/stream
 * 
 * Run: npm run test:run -- test/api/media.signed.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";
import {
    generateSignedLink,
    verifyProxyToken,
    generateProxyToken,
    isValidProvider,
    isValidFileId,
    SIGNING_KEY,
} from "../../server/services/media/signedLink";

// =============================================================================
// MOCKS
// =============================================================================

vi.mock("../../server/services/media/driveClient", () => ({
    getDriveFileUrl: vi.fn().mockResolvedValue("https://drive.google.com/file/d/abc123/preview"),
    streamDriveFile: vi.fn(),
}));

vi.mock("../../server/services/media/graphClient", () => ({
    getOneDriveFileUrl: vi.fn().mockResolvedValue("https://onedrive.live.com/download?id=xyz789"),
    streamOneDriveFile: vi.fn(),
}));

// =============================================================================
// TESTS
// =============================================================================

describe("Signed Link Service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("generateSignedLink", () => {
        it("should generate signed link for google_drive", async () => {
            const result = await generateSignedLink({
                file_id: "gdrive-file-123",
                provider: "google_drive",
                start: 65,
                expiry: 300,
            });

            expect(result.playUrl).toBeDefined();
            expect(result.start_sec).toBe(65);
            expect(result.expiry_at).toBeDefined();
            expect(new Date(result.expiry_at).getTime()).toBeGreaterThan(Date.now());
        });

        it("should include timestamp parameter for drive video", async () => {
            const result = await generateSignedLink({
                file_id: "video-123",
                provider: "google_drive",
                start: 120,
            });

            // Should have #t= for timestamp jumping
            expect(result.playUrl).toMatch(/#t=\d+|start=/);
            expect(result.start_sec).toBe(120);
        });

        it("should generate signed link for onedrive", async () => {
            const result = await generateSignedLink({
                file_id: "onedrive-file-456",
                provider: "onedrive",
            });

            expect(result.playUrl).toBeDefined();
            expect(result.start_sec).toBe(0);
        });

        it("should generate proxy link for local files", async () => {
            const result = await generateSignedLink({
                file_id: "local-file.mp4",
                provider: "local",
                start: 30,
            });

            expect(result.playUrl).toContain("/media/stream?token=");
            expect(result.playUrl).toContain("start=30");
            expect(result.is_proxy).toBe(true);
        });

        it("should respect expiry limits", async () => {
            // Max expiry is 3600 seconds
            const result = await generateSignedLink({
                file_id: "file-123",
                provider: "local",
                expiry: 7200, // Over max
            });

            const expiryTime = new Date(result.expiry_at).getTime();
            const maxExpected = Date.now() + 3600 * 1000;

            expect(expiryTime).toBeLessThanOrEqual(maxExpected + 1000);
        });

        it("should enforce minimum expiry", async () => {
            const result = await generateSignedLink({
                file_id: "file-123",
                provider: "local",
                expiry: 10, // Under min (60)
            });

            const expiryTime = new Date(result.expiry_at).getTime();
            const minExpected = Date.now() + 60 * 1000;

            expect(expiryTime).toBeGreaterThanOrEqual(minExpected - 1000);
        });
    });

    describe("Proxy Token Generation", () => {
        it("should generate valid JWT token", () => {
            const token = generateProxyToken(
                "file-123",
                "google_drive",
                300,
                "user-abc",
                "mod-xyz"
            );

            expect(token).toBeDefined();
            expect(typeof token).toBe("string");

            // Verify token is valid JWT
            const decoded = jwt.verify(token, SIGNING_KEY) as any;
            expect(decoded.file_id).toBe("file-123");
            expect(decoded.provider).toBe("google_drive");
            expect(decoded.user_id).toBe("user-abc");
            expect(decoded.module_id).toBe("mod-xyz");
        });

        it("should set correct expiry on token", () => {
            const token = generateProxyToken(
                "file-123",
                "local",
                600 // 10 minutes
            );

            const decoded = jwt.verify(token, SIGNING_KEY) as any;
            const expectedExp = Math.floor(Date.now() / 1000) + 600;

            // Allow 2 second tolerance
            expect(decoded.exp).toBeGreaterThanOrEqual(expectedExp - 2);
            expect(decoded.exp).toBeLessThanOrEqual(expectedExp + 2);
        });
    });

    describe("Proxy Token Verification", () => {
        it("should verify valid token", () => {
            const token = generateProxyToken("file-xyz", "onedrive", 300);

            const payload = verifyProxyToken(token);

            expect(payload).not.toBeNull();
            expect(payload?.file_id).toBe("file-xyz");
            expect(payload?.provider).toBe("onedrive");
        });

        it("should return null for invalid token", () => {
            const payload = verifyProxyToken("invalid-token-string");

            expect(payload).toBeNull();
        });

        it("should return null for expired token", () => {
            // Create an expired token
            const token = jwt.sign(
                {
                    file_id: "file-123",
                    provider: "local",
                    exp: Math.floor(Date.now() / 1000) - 100, // Expired 100 sec ago
                },
                SIGNING_KEY
            );

            const payload = verifyProxyToken(token);

            expect(payload).toBeNull();
        });

        it("should return null for token with wrong signature", () => {
            const token = jwt.sign(
                { file_id: "file-123", provider: "local" },
                "wrong-secret-key",
                { expiresIn: 300 }
            );

            const payload = verifyProxyToken(token);

            expect(payload).toBeNull();
        });
    });

    describe("Validation Helpers", () => {
        describe("isValidProvider", () => {
            it("should return true for valid providers", () => {
                expect(isValidProvider("google_drive")).toBe(true);
                expect(isValidProvider("onedrive")).toBe(true);
                expect(isValidProvider("local")).toBe(true);
            });

            it("should return false for invalid providers", () => {
                expect(isValidProvider("dropbox")).toBe(false);
                expect(isValidProvider("s3")).toBe(false);
                expect(isValidProvider("")).toBe(false);
            });
        });

        describe("isValidFileId", () => {
            it("should return true for valid file IDs", () => {
                expect(isValidFileId("file-123")).toBe(true);
                expect(isValidFileId("abc_xyz")).toBe(true);
                expect(isValidFileId("1a2b3c4d")).toBe(true);
                expect(isValidFileId("FILE-TEST-001")).toBe(true);
            });

            it("should return false for invalid file IDs", () => {
                expect(isValidFileId("")).toBe(false);
                expect(isValidFileId("file with spaces")).toBe(false);
                expect(isValidFileId("file/with/slashes")).toBe(false);
                expect(isValidFileId("a".repeat(300))).toBe(false); // Too long
            });
        });
    });

    describe("Error Handling", () => {
        it("should fall back to proxy on drive error", async () => {
            // Mock drive client to throw
            vi.doMock("../../server/services/media/driveClient", () => ({
                getDriveFileUrl: vi.fn().mockRejectedValue(new Error("Drive API error")),
            }));

            const result = await generateSignedLink({
                file_id: "error-file",
                provider: "google_drive",
            });

            // Should still return a result (proxy fallback)
            expect(result.playUrl).toBeDefined();
            expect(result.is_proxy).toBe(true);
        });

        it("should throw for unsupported provider", async () => {
            await expect(
                generateSignedLink({
                    file_id: "file-123",
                    provider: "dropbox" as any,
                })
            ).rejects.toThrow();
        });
    });

    describe("Security", () => {
        it("should not expose raw credentials in play URL", async () => {
            const result = await generateSignedLink({
                file_id: "file-123",
                provider: "google_drive",
            });

            // URL should not contain sensitive patterns
            expect(result.playUrl).not.toMatch(/api[-_]?key/i);
            expect(result.playUrl).not.toMatch(/secret/i);
            expect(result.playUrl).not.toMatch(/password/i);
        });

        it("should include user context in proxy token", async () => {
            const result = await generateSignedLink({
                file_id: "file-123",
                provider: "local",
                user_id: "user-abc",
                module_id: "mod-xyz",
            });

            // Extract token from URL
            const tokenMatch = result.playUrl.match(/token=([^&]+)/);
            expect(tokenMatch).not.toBeNull();

            const token = decodeURIComponent(tokenMatch![1]);
            const payload = verifyProxyToken(token);

            expect(payload?.user_id).toBe("user-abc");
            expect(payload?.module_id).toBe("mod-xyz");
        });
    });
});

// =============================================================================
// INTEGRATION-LIKE TESTS
// =============================================================================

describe("Media Playback Flow", () => {
    it("should complete full flow: generate link -> verify token -> stream", async () => {
        // Step 1: Generate signed link
        const playResult = await generateSignedLink({
            file_id: "lecture-video.mp4",
            provider: "local",
            start: 180,
            user_id: "student-123",
            module_id: "mod-hr-101",
        });

        expect(playResult.playUrl).toContain("token=");
        expect(playResult.start_sec).toBe(180);

        // Step 2: Extract and verify token
        const tokenMatch = playResult.playUrl.match(/token=([^&]+)/);
        const token = decodeURIComponent(tokenMatch![1]);

        const payload = verifyProxyToken(token);
        expect(payload).not.toBeNull();
        expect(payload?.file_id).toBe("lecture-video.mp4");
        expect(payload?.provider).toBe("local");
        expect(payload?.user_id).toBe("student-123");
        expect(payload?.module_id).toBe("mod-hr-101");

        // Step 3: Token should be valid for streaming
        // (Actual streaming tested in stream endpoint tests)
    });

    it("should support timestamp jumping for evidence playback", async () => {
        // Simulate playing evidence at specific timestamp
        const evidenceStart = 65.5;

        const result = await generateSignedLink({
            file_id: "lecture.mp4",
            provider: "local",
            start: evidenceStart,
        });

        expect(result.start_sec).toBe(evidenceStart);
        expect(result.playUrl).toContain(`start=${evidenceStart}`);
    });
});
