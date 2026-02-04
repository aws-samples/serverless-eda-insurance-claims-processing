"use strict";
/**
 * Voice Claim Component - Entry point
 *
 * Exports all public components and types for the Voice Claim feature
 *
 * Requirements: 2.1, 9.1
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OUTPUT_AUDIO_CONFIG = exports.INPUT_AUDIO_CONFIG = exports.ErrorDisplay = exports.ConfirmationUI = exports.ClaimFieldsDisplay = exports.TranscriptionDisplay = exports.WaveformAnimation = exports.AudioPlayback = exports.AudioCapture = exports.WebSocketAudioClient = exports.VoiceClaimComponent = void 0;
var VoiceClaimComponent_1 = require("./VoiceClaimComponent");
Object.defineProperty(exports, "VoiceClaimComponent", { enumerable: true, get: function () { return VoiceClaimComponent_1.VoiceClaimComponent; } });
var WebSocketAudioClient_1 = require("./WebSocketAudioClient");
Object.defineProperty(exports, "WebSocketAudioClient", { enumerable: true, get: function () { return WebSocketAudioClient_1.WebSocketAudioClient; } });
var AudioCapture_1 = require("./AudioCapture");
Object.defineProperty(exports, "AudioCapture", { enumerable: true, get: function () { return AudioCapture_1.AudioCapture; } });
var AudioPlayback_1 = require("./AudioPlayback");
Object.defineProperty(exports, "AudioPlayback", { enumerable: true, get: function () { return AudioPlayback_1.AudioPlayback; } });
var WaveformAnimation_1 = require("./WaveformAnimation");
Object.defineProperty(exports, "WaveformAnimation", { enumerable: true, get: function () { return WaveformAnimation_1.WaveformAnimation; } });
var TranscriptionDisplay_1 = require("./TranscriptionDisplay");
Object.defineProperty(exports, "TranscriptionDisplay", { enumerable: true, get: function () { return TranscriptionDisplay_1.TranscriptionDisplay; } });
var ClaimFieldsDisplay_1 = require("./ClaimFieldsDisplay");
Object.defineProperty(exports, "ClaimFieldsDisplay", { enumerable: true, get: function () { return ClaimFieldsDisplay_1.ClaimFieldsDisplay; } });
var ConfirmationUI_1 = require("./ConfirmationUI");
Object.defineProperty(exports, "ConfirmationUI", { enumerable: true, get: function () { return ConfirmationUI_1.ConfirmationUI; } });
var ErrorDisplay_1 = require("./ErrorDisplay");
Object.defineProperty(exports, "ErrorDisplay", { enumerable: true, get: function () { return ErrorDisplay_1.ErrorDisplay; } });
var types_1 = require("./types");
Object.defineProperty(exports, "INPUT_AUDIO_CONFIG", { enumerable: true, get: function () { return types_1.INPUT_AUDIO_CONFIG; } });
Object.defineProperty(exports, "OUTPUT_AUDIO_CONFIG", { enumerable: true, get: function () { return types_1.OUTPUT_AUDIO_CONFIG; } });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCw2REFBNEQ7QUFBbkQsMEhBQUEsbUJBQW1CLE9BQUE7QUFDNUIsK0RBQThEO0FBQXJELDRIQUFBLG9CQUFvQixPQUFBO0FBQzdCLCtDQUE4QztBQUFyQyw0R0FBQSxZQUFZLE9BQUE7QUFDckIsaURBQWdEO0FBQXZDLDhHQUFBLGFBQWEsT0FBQTtBQUN0Qix5REFBd0Q7QUFBL0Msc0hBQUEsaUJBQWlCLE9BQUE7QUFDMUIsK0RBQThEO0FBQXJELDRIQUFBLG9CQUFvQixPQUFBO0FBQzdCLDJEQUEwRDtBQUFqRCx3SEFBQSxrQkFBa0IsT0FBQTtBQUMzQixtREFBa0Q7QUFBekMsZ0hBQUEsY0FBYyxPQUFBO0FBQ3ZCLCtDQUE4QztBQUFyQyw0R0FBQSxZQUFZLE9BQUE7QUFvQnJCLGlDQUdpQjtBQUZmLDJHQUFBLGtCQUFrQixPQUFBO0FBQ2xCLDRHQUFBLG1CQUFtQixPQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBWb2ljZSBDbGFpbSBDb21wb25lbnQgLSBFbnRyeSBwb2ludFxuICogXG4gKiBFeHBvcnRzIGFsbCBwdWJsaWMgY29tcG9uZW50cyBhbmQgdHlwZXMgZm9yIHRoZSBWb2ljZSBDbGFpbSBmZWF0dXJlXG4gKiBcbiAqIFJlcXVpcmVtZW50czogMi4xLCA5LjFcbiAqL1xuXG5leHBvcnQgeyBWb2ljZUNsYWltQ29tcG9uZW50IH0gZnJvbSAnLi9Wb2ljZUNsYWltQ29tcG9uZW50JztcbmV4cG9ydCB7IFdlYlNvY2tldEF1ZGlvQ2xpZW50IH0gZnJvbSAnLi9XZWJTb2NrZXRBdWRpb0NsaWVudCc7XG5leHBvcnQgeyBBdWRpb0NhcHR1cmUgfSBmcm9tICcuL0F1ZGlvQ2FwdHVyZSc7XG5leHBvcnQgeyBBdWRpb1BsYXliYWNrIH0gZnJvbSAnLi9BdWRpb1BsYXliYWNrJztcbmV4cG9ydCB7IFdhdmVmb3JtQW5pbWF0aW9uIH0gZnJvbSAnLi9XYXZlZm9ybUFuaW1hdGlvbic7XG5leHBvcnQgeyBUcmFuc2NyaXB0aW9uRGlzcGxheSB9IGZyb20gJy4vVHJhbnNjcmlwdGlvbkRpc3BsYXknO1xuZXhwb3J0IHsgQ2xhaW1GaWVsZHNEaXNwbGF5IH0gZnJvbSAnLi9DbGFpbUZpZWxkc0Rpc3BsYXknO1xuZXhwb3J0IHsgQ29uZmlybWF0aW9uVUkgfSBmcm9tICcuL0NvbmZpcm1hdGlvblVJJztcbmV4cG9ydCB7IEVycm9yRGlzcGxheSB9IGZyb20gJy4vRXJyb3JEaXNwbGF5JztcblxuZXhwb3J0IHR5cGUge1xuICBWb2ljZUNsYWltUHJvcHMsXG4gIENvbm5lY3Rpb25TdGF0dXMsXG4gIENvbnZlcnNhdGlvblBoYXNlLFxuICBMb2NhdGlvbixcbiAgSW5jaWRlbnQsXG4gIFBvbGljeSxcbiAgUGVyc29uYWxJbmZvcm1hdGlvbixcbiAgUG9saWNlUmVwb3J0LFxuICBPdGhlclBhcnR5LFxuICBDbGFpbURhdGEsXG4gIEF1ZGlvU3RyZWFtQ29uZmlnLFxuICBFcnJvclR5cGUsXG4gIFZvaWNlQ2xhaW1FcnJvcixcbiAgV2ViU29ja2V0TWVzc2FnZVR5cGUsXG4gIFdlYlNvY2tldE1lc3NhZ2Vcbn0gZnJvbSAnLi90eXBlcyc7XG5cbmV4cG9ydCB7XG4gIElOUFVUX0FVRElPX0NPTkZJRyxcbiAgT1VUUFVUX0FVRElPX0NPTkZJR1xufSBmcm9tICcuL3R5cGVzJztcbiJdfQ==