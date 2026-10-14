import type { GenEnum, GenFile, GenMessage, GenService } from "@bufbuild/protobuf/codegenv2";
import type { Message } from "@bufbuild/protobuf";
/**
 * Describes the file signals.proto.
 */
export declare const file_signals: GenFile;
/**
 * @generated from message traffic.signals.v1.SubscribeRequest
 */
export type SubscribeRequest = Message<"traffic.signals.v1.SubscribeRequest"> & {};
/**
 * Describes the message traffic.signals.v1.SubscribeRequest.
 * Use `create(SubscribeRequestSchema)` to create a new message.
 */
export declare const SubscribeRequestSchema: GenMessage<SubscribeRequest>;
/**
 * @generated from message traffic.signals.v1.SignalState
 */
export type SignalState = Message<"traffic.signals.v1.SignalState"> & {
    /**
     * @generated from field: string intersection_id = 1;
     */
    intersectionId: string;
    /**
     * @generated from field: traffic.signals.v1.Phase phase = 2;
     */
    phase: Phase;
    /**
     * @generated from field: double remaining_s = 3;
     */
    remainingS: number;
};
/**
 * Describes the message traffic.signals.v1.SignalState.
 * Use `create(SignalStateSchema)` to create a new message.
 */
export declare const SignalStateSchema: GenMessage<SignalState>;
/**
 * @generated from message traffic.signals.v1.SignalFrame
 */
export type SignalFrame = Message<"traffic.signals.v1.SignalFrame"> & {
    /**
     * @generated from field: int64 tick = 1;
     */
    tick: bigint;
    /**
     * @generated from field: repeated traffic.signals.v1.SignalState states = 2;
     */
    states: SignalState[];
};
/**
 * Describes the message traffic.signals.v1.SignalFrame.
 * Use `create(SignalFrameSchema)` to create a new message.
 */
export declare const SignalFrameSchema: GenMessage<SignalFrame>;
/**
 * @generated from message traffic.signals.v1.GetPhaseRequest
 */
export type GetPhaseRequest = Message<"traffic.signals.v1.GetPhaseRequest"> & {
    /**
     * @generated from field: string intersection_id = 1;
     */
    intersectionId: string;
    /**
     * @generated from field: int64 tick = 2;
     */
    tick: bigint;
};
/**
 * Describes the message traffic.signals.v1.GetPhaseRequest.
 * Use `create(GetPhaseRequestSchema)` to create a new message.
 */
export declare const GetPhaseRequestSchema: GenMessage<GetPhaseRequest>;
/**
 * @generated from message traffic.signals.v1.GetPhaseResponse
 */
export type GetPhaseResponse = Message<"traffic.signals.v1.GetPhaseResponse"> & {
    /**
     * @generated from field: string intersection_id = 1;
     */
    intersectionId: string;
    /**
     * @generated from field: traffic.signals.v1.Phase phase = 2;
     */
    phase: Phase;
    /**
     * @generated from field: double remaining_s = 3;
     */
    remainingS: number;
};
/**
 * Describes the message traffic.signals.v1.GetPhaseResponse.
 * Use `create(GetPhaseResponseSchema)` to create a new message.
 */
export declare const GetPhaseResponseSchema: GenMessage<GetPhaseResponse>;
/**
 * @generated from enum traffic.signals.v1.Phase
 */
export declare enum Phase {
    /**
     * @generated from enum value: PHASE_UNSPECIFIED = 0;
     */
    PHASE_UNSPECIFIED = 0,
    /**
     * @generated from enum value: NS_GREEN = 1;
     */
    NS_GREEN = 1,
    /**
     * @generated from enum value: NS_YELLOW = 2;
     */
    NS_YELLOW = 2,
    /**
     * @generated from enum value: EW_GREEN = 3;
     */
    EW_GREEN = 3,
    /**
     * @generated from enum value: EW_YELLOW = 4;
     */
    EW_YELLOW = 4
}
/**
 * Describes the enum traffic.signals.v1.Phase.
 */
export declare const PhaseSchema: GenEnum<Phase>;
/**
 * @generated from service traffic.signals.v1.SignalService
 */
export declare const SignalService: GenService<{
    /**
     * @generated from rpc traffic.signals.v1.SignalService.SubscribeSignals
     */
    subscribeSignals: {
        methodKind: "server_streaming";
        input: typeof SubscribeRequestSchema;
        output: typeof SignalFrameSchema;
    };
    /**
     * @generated from rpc traffic.signals.v1.SignalService.GetPhase
     */
    getPhase: {
        methodKind: "unary";
        input: typeof GetPhaseRequestSchema;
        output: typeof GetPhaseResponseSchema;
    };
}>;
