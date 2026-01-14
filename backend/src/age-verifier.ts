export class AgeVerifier {
    identityToOver18Map: Map<string, boolean>;
    constructor() {
        this.identityToOver18Map = new Map();
    }

    setVerifiedOver18(identity: string): void {
        this.identityToOver18Map.set(identity, true);
    }

    checkVerifiedOver18(identity: string): boolean {
        return this.identityToOver18Map.get(identity) === true;
    }

}