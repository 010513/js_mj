

cc.Class({
    extends: cc.Component,

    properties: {
        _splash:null,
    },

    // LIFE-CYCLE CALLBACKS:

     onLoad () {
         this._splash = cc.find("Canvas/splash");
     },

    start () {
        let self = this;
        let SHOW_TIME = 3000;
        let FADE_TIME = 500;

        if(cc.sys.os != cc.sys.OS_IOS || !cc.sys.isNative){
            self._splash.active = true;
            let t = Date.now();
            let fn = function(){
                let dt = Date.now() - t;
                if(dt < SHOW_TIME){
                    setTimeout(fn,33);
                }
                else{
                    let op = (1 - ((dt - SHOW_TIME) / FADE_TIME)) * 255;
                    if(op < 0){
                        self._splash.opacity = 0;
                        cc.director.loadScene("update");
                    }
                    else{
                        self._splash.opacity = op;
                        setTimeout(fn,33);
                    }
                }
            }
            setTimeout(fn,33);
        }
        else{
            this._splash.active = false;
            cc.director.loadScene("update");
        }
    },

    // update (dt) {},
});
