import Handler from "./handler";
import ProtoWrapper from "../../data/protobufs/proto-wrapper";
import {broadcast, Client, isHost} from "../peerconnection";
import GameController from "../../controllers/game";
import {MeasurePacket} from "../packets/measure-packets";
import {SHAPE_TYPES, UiShape} from "../../renderer/ui-components/ui-shape";
import {UiMarker} from "../../renderer/ui-components/ui-marker";
import {observable} from "mobx";

interface MeasureElements {
    shape: UiShape;
    marker: UiMarker;
}

export default class MeasureHandler extends Handler {
    readonly packets: typeof ProtoWrapper[] = [MeasurePacket];
    private readonly controller: GameController;
    public static readonly userShapes: Record<string, MeasureElements> = {};
    @observable public static displayMeasures = true;

    constructor(controller: GameController) {
        super();
        this.controller = controller;
    }


    async clientHandler(client: Client, packet: MeasurePacket): Promise<void> {
        this.handleShape(client.id, packet);
    }

    async hostHandler(client: Client, packet: MeasurePacket): Promise<void> {
        this.handleShape(client.id, packet);
        broadcast(packet, true, client);
    }

    private handleShape(id: string, pkt: MeasurePacket|null) {
        const exist = MeasureHandler.userShapes[id];
        if (exist) {
            exist.marker.remove();
            exist.shape.remove();
            delete MeasureHandler.userShapes[id];
        }
        if (pkt && pkt.visible) {
            MeasureHandler.userShapes[id] = {
                shape: new UiShape(pkt.type as SHAPE_TYPES)
                    .color(pkt.color)
                    .setRotation(pkt.angle)
                    .size(pkt.tw, pkt.th)
                    .setPosPx(pkt.px, pkt.py)
                    .thickness(pkt.thickness)
                    .setFillColor(pkt.fill, pkt.alpha)
                    .setVisible(MeasureHandler.displayMeasures),
                marker: new UiMarker((pkt.tw*5)+'ft').place(pkt.tx, pkt.ty).setVisible(MeasureHandler.displayMeasures)
            }
            if (isHost()) {
                MeasureHandler.userShapes[id].shape.onClick(() => {
                    MeasureHandler.sendMeasure(MeasureHandler.userShapes[id].shape, false);
                    this.handleShape(id, null);
                })
            }
        }
    }

    public static sendMeasure(shape: UiShape, visible: boolean) {
        const dt = shape.getGraphicDetails();
        const pkt = new MeasurePacket().assign({
            type: shape.getType(),
            px: shape.position.px,
            py: shape.position.py,
            tw: shape.dimensions.tw,
            th: shape.dimensions.th,
            angle: shape.rotation,
            color: dt.border,
            thickness: dt.thickness,
            fill: dt.fill,
            alpha: dt.fillAlpha,
            tx: shape.position.tx,
            ty: shape.position.ty,
            visible
        });

        console.log(visible, pkt);
        return broadcast(pkt, false);
    }

    /**
     * Toggle measure visibility.
     * @param show
     */
    public static showMeasures(show: boolean) {
        this.displayMeasures = show;
        for (const m of Object.values(MeasureHandler.userShapes)) {
            m.shape.setVisible(show);
            m.marker.setVisible(show);
        }
    }
}
