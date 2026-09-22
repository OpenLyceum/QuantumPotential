/**
 * QPPWNamespace.ts
 *
 * The SceneryStack Namespace for this simulation. It is used as the first argument to
 * ProfileColorProperty (so color names are scoped to this sim) and for registering objects
 * with the PhET-iO API.
 */
import { Namespace } from "scenerystack/phet-core";

const qppw = new Namespace("quantum-potential");

export default qppw;
