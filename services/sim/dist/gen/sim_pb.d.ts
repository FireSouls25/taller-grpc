import type { GenFile, GenMessage, GenService } from "@bufbuild/protobuf/codegenv2";
import type { Message } from "@bufbuild/protobuf";
/**
 * Describes the file sim.proto.
 */
export declare const file_sim: GenFile;
/**
 * @generated from message traffic.sim.v1.SubscribeRequest
 */
export type SubscribeRequest = Message<"traffic.sim.v1.SubscribeRequest"> & {};
/**
 * Describes the message traffic.sim.v1.SubscribeRequest.
 * Use `create(SubscribeRequestSchema)` to create a new message.
 */
export declare const SubscribeRequestSchema: GenMessage<SubscribeRequest>;
/**
 * @generated from message traffic.sim.v1.Vehicle
 */
export type Vehicle = Message<"traffic.sim.v1.Vehicle"> & {
    /**
     * @generated from field: int32 id = 1;
     */
    id: number;
    /**
     * @generated from field: double x = 2;
     */
    x: number;
    /**
     * @generated from field: double y = 3;
     */
    y: number;
    /**
     * @generated from field: double heading_deg = 4;
     */
    headingDeg: number;
    /**
     * @generated from field: double speed_mps = 5;
     */
    speedMps: number;
    /**
     * @generated from field: string color = 6;
     */
    color: string;
};
/**
 * Describes the message traffic.sim.v1.Vehicle.
 * Use `create(VehicleSchema)` to create a new message.
 */
export declare const VehicleSchema: GenMessage<Vehicle>;
/**
 * @generated from message traffic.sim.v1.Frame
 */
export type Frame = Message<"traffic.sim.v1.Frame"> & {
    /**
     * @generated from field: int64 tick = 1;
     */
    tick: bigint;
    /**
     * @generated from field: repeated traffic.sim.v1.Vehicle vehicles = 2;
     */
    vehicles: Vehicle[];
};
/**
 * Describes the message traffic.sim.v1.Frame.
 * Use `create(FrameSchema)` to create a new message.
 */
export declare const FrameSchema: GenMessage<Frame>;
/**
 * @generated from message traffic.sim.v1.ControlRequest
 */
export type ControlRequest = Message<"traffic.sim.v1.ControlRequest"> & {
    /**
     * @generated from field: optional bool running = 1;
     */
    running?: boolean | undefined;
    /**
     * @generated from field: optional double speed = 2;
     */
    speed?: number | undefined;
    /**
     * @generated from field: optional double spawn_rate = 3;
     */
    spawnRate?: number | undefined;
};
/**
 * Describes the message traffic.sim.v1.ControlRequest.
 * Use `create(ControlRequestSchema)` to create a new message.
 */
export declare const ControlRequestSchema: GenMessage<ControlRequest>;
/**
 * @generated from message traffic.sim.v1.ControlResponse
 */
export type ControlResponse = Message<"traffic.sim.v1.ControlResponse"> & {
    /**
     * @generated from field: bool running = 1;
     */
    running: boolean;
    /**
     * @generated from field: double speed = 2;
     */
    speed: number;
    /**
     * @generated from field: double spawn_rate = 3;
     */
    spawnRate: number;
    /**
     * @generated from field: int64 tick = 4;
     */
    tick: bigint;
    /**
     * @generated from field: int32 vehicle_count = 5;
     */
    vehicleCount: number;
};
/**
 * Describes the message traffic.sim.v1.ControlResponse.
 * Use `create(ControlResponseSchema)` to create a new message.
 */
export declare const ControlResponseSchema: GenMessage<ControlResponse>;
/**
 * @generated from service traffic.sim.v1.SimService
 */
export declare const SimService: GenService<{
    /**
     * @generated from rpc traffic.sim.v1.SimService.SubscribeFrames
     */
    subscribeFrames: {
        methodKind: "server_streaming";
        input: typeof SubscribeRequestSchema;
        output: typeof FrameSchema;
    };
    /**
     * @generated from rpc traffic.sim.v1.SimService.Control
     */
    control: {
        methodKind: "unary";
        input: typeof ControlRequestSchema;
        output: typeof ControlResponseSchema;
    };
}>;
