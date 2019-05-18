cc.Class({
    extends: cc.Component,

    properties: {
        updatePanel: {
            default: null,
            type: cc.Node
        },
        manifestUrl: {
            type: cc.Asset,
            default: null
        },
        percent: {
            default: null,
            type: cc.Label
        },
        lblErr: {
            default: null,
            type: cc.Label
        }
    },

    /*
    enum class EventCode
    {
        ERROR_NO_LOCAL_MANIFEST,
        ERROR_DOWNLOAD_MANIFEST,
        ERROR_PARSE_MANIFEST,
        NEW_VERSION_FOUND,
        ALREADY_UP_TO_DATE,
        UPDATE_PROGRESSION,
        ASSET_UPDATED,
        ERROR_UPDATING,
        UPDATE_FINISHED,
        UPDATE_FAILED,
        ERROR_DECOMPRESS
    };
    */
    checkCb: function (event) {
        cc.log('Code: ' + event.getEventCode());
        switch (event.getEventCode())
        {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                cc.log("No local manifest file found, hot update skipped.");
                break;
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                cc.log("Fail to download manifest file, hot update skipped.");
                break;
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                cc.log("Already up to date with the latest remote version.");
                this.lblErr.string += "游戏不需要更新\n";
                cc.director.loadScene("loading");
                break;
            case jsb.EventAssetsManager.NEW_VERSION_FOUND:
                cc.log("NEW_VERSION_FOUND");
                this._needUpdate = true;
                this.updatePanel.active = true;
                this.percent.string = '00.00%';
                break;
            case jsb.EventAssetsManager.UPDATE_PROGRESSION:
                cc.log("UPDATE_PROGRESSION");
                break;
            default:
                break;
        }
        this._am.setEventCallback(null);
        this.hotUpdate();
    },

    updateCb: function (event) {
        var needRestart = false;
        var failed = false;
        switch (event.getEventCode())
        {
            case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
                cc.log('No local manifest file found, hot update skipped.');
                failed = true;
                break;
            case jsb.EventAssetsManager.UPDATE_PROGRESSION:
                var percent = event.getPercent();
                var percentByFile = event.getPercentByFile();
                // this.panel.fileLabel.string = event.getDownloadedFiles() + ' / ' + event.getTotalFiles();
                // this.panel.byteLabel.string = event.getDownloadedBytes() + ' / ' + event.getTotalBytes();
                var msg = event.getMessage();
                if (msg) {
                    cc.log(msg);
                }
                cc.log(percent.toFixed(2) + '%');
                this.percent.string = percent + '%';
                break;
            case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
            case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
                cc.log('Fail to download manifest file, hot update skipped.');
                failed = true;
                break;
            case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
                cc.log('Already up to date with the latest remote version.');
                failed = true;
                break;
            case jsb.EventAssetsManager.UPDATE_FINISHED:
                cc.log('Update finished. ' + event.getMessage());

                needRestart = true;
                break;
            case jsb.EventAssetsManager.UPDATE_FAILED:
                cc.log('Update failed. ' + event.getMessage());

                this._failCount ++;
                if (this._failCount < 5)
                {
                    this._am.downloadFailedAssets();
                }
                else
                {
                    cc.log('Reach maximum fail count, exit update process');
                    this._failCount = 0;
                    failed = true;
                }
                break;
            case jsb.EventAssetsManager.ERROR_UPDATING:
                cc.log('Asset update error: ' + event.getAssetId() + ', ' + event.getMessage());
                break;
            case jsb.EventAssetsManager.ERROR_DECOMPRESS:
                cc.log(event.getMessage());
                break;
            default:
                break;
        }

        if (failed) {
            this._am.setEventCallback(null)
            this.updatePanel.active = false;
        }

        if (needRestart) {
            this._am.setEventCallback(null);
            // Prepend the manifest's search path
            var searchPaths = jsb.fileUtils.getSearchPaths();
            var newPaths = this._am.getLocalManifest().getSearchPaths();
            console.log(JSON.stringify(newPaths));
            Array.prototype.unshift.apply(searchPaths, newPaths);
            // This value will be retrieved and appended to the default search path during game startup,
            // please refer to samples/js-tests/main.js for detailed usage.
            // !!! Re-add the search paths in main.js is very important, otherwise, new scripts won't take effect.
            cc.sys.localStorage.setItem('HotUpdateSearchPaths', JSON.stringify(searchPaths));

            jsb.fileUtils.setSearchPaths(searchPaths);
            this.lblErr.string += "游戏资源更新完毕\n";
            cc.audioEngine.stopAll();
            cc.game.restart();
        }
    },

    hotUpdate: function () {
        if (this._am && this._needUpdate) {
            this.lblErr.string += "开始更新游戏资源...\n";
            // this._updateListener = new jsb.EventListenerAssetsManager(this._am, this.updateCb.bind(this));
            // cc.eventManager.addListener(this._updateListener, 1);
            //this._am.setEventCallback(this.updateCb.bind(this));

            this._failCount = 0;
            //this._am.update();
        }
        else{
            //this.lblErr.string += "已经是最新版本...\n";
            //cc.director.loadScene("loading");
        }
    },

    // use this for initialization
    onLoad: function () {
        // Hot update is only available in Native build
        if (!cc.sys.isNative) {
           // return;
           cc.director.loadScene("loading");
        }
        else
        {
            // Setup your own version compare handler, versionA and B is versions in string
            // if the return value greater than 0, versionA is greater than B,
            // if the return value equals 0, versionA equals to B,
            // if the return value smaller than 0, versionA is smaller than B.
            this.versionCompareHandle = function (versionA, versionB) {
                cc.log("JS Custom Version Compare: version A is " + versionA + ', version B is ' + versionB);
                var vA = versionA.split('.');
                var vB = versionB.split('.');
                for (var i = 0; i < vA.length; ++i) {
                    var a = parseInt(vA[i]);
                    var b = parseInt(vB[i] || 0);
                    if (a === b) {
                        continue;
                    }
                    else {
                        return a - b;
                    }
                }
                if (vB.length > vA.length) {
                    return -1;
                }
                else {
                    return 0;
                }
            };

            this.lblErr.string += "检查游戏资源...\n";
            var storagePath = ((jsb.fileUtils ? jsb.fileUtils.getWritablePath() : '/') + 'jsqipai-asset');
            cc.log('Storage path for remote asset : ' + storagePath);
            this.lblErr.string += storagePath + "\n";
            // var url = this.manifestUrl.nativeUrl;
            // if (cc.loader.md5Pipe) {
            //     url = cc.loader.md5Pipe.transformURL(url);
            // }
            // cc.log('Local manifest URL : ' + url);
            this._am = new jsb.AssetsManager('', storagePath,this.versionCompareHandle);
            this._needUpdate = false;
            // Setup the verification callback, but we don't have md5 check function yet, so only print some message
            // Return true if the verification passed, otherwise return false
            this._am.setVerifyCallback(function (path, asset) {
                // When asset is compressed, we don't need to check its md5, because zip file have been deleted.
                var compressed = asset.compressed;
                // Retrieve the correct md5 value.
                var expectedMD5 = asset.md5;
                // asset.path is relative path and path is absolute.
                var relativePath = asset.path;
                // The size of asset file, but this value could be absent.
                var size = asset.size;
                if (compressed) {
                    let strLog = "Verification passed : " + relativePath;
                    cc.log(strLog);
                    return true;
                }
                else {
                    let strLog = "Verification passed : " + relativePath + ' (' + expectedMD5 + ')';
                    cc.log(strLog);
                    return true;
                }
            });
            if (cc.sys.os === cc.sys.OS_ANDROID) {
                // Some Android device may slow down the download process when concurrent tasks is too much.
                // The value may not be accurate, please do more test and find what's most suitable for your game.
                this._am.setMaxConcurrentTask(2);
                let strLog = "Max concurrent tasks count have been limited to 2";
                cc.log(strLog);
            }
            // if (this._am.getLocalManifest().isLoaded())
            // {
            //     cc.log("getLocalManifest().isLoaded()")
            //     //this._checkListener = new jsb.EventListenerAssetsManager(this._am, this.checkCb.bind(this));
            //     //cc.eventManager.addListener(this._checkListener, 1);

            //     //this._am.checkUpdate();
            //     this._am.setEventCallback(this.checkCb.bind(this));
            //     this._am.checkUpdate();
            // }
        }
        
    },

    start: function(){
        if (this._am.getState() === jsb.AssetsManager.State.UNINITED) {
            // Resolve md5 url
            var url = this.manifestUrl.nativeUrl;
            if (cc.loader.md5Pipe) {
                url = cc.loader.md5Pipe.transformURL(url);
            }
            cc.log('Local manifest URL : ' + url);
            this._am.loadLocalManifest(url);
        }
        if (!this._am.getLocalManifest() || !this._am.getLocalManifest().isLoaded()) {
            this.panel.info.string = 'Failed to load local manifest ...';
            return;
        }
        this._am.setEventCallback(this.checkCb.bind(this));

        this._am.checkUpdate();
    },

    onDestroy: function () {
        if(this._am){
            this._am.setEventCallback(null);
        }
    }
});
