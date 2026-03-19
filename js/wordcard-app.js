// ═══ 引用功能样式（行内注入，不碰 style.css）═══
(function(){
  // ═══ 语音字卡 UI 样式注入 ═══
  (function(){
    var s = document.createElement('style');
    s.textContent = `
.wc-vc-group-section{margin-bottom:12px;border:1px solid var(--border,#e0e0e0);border-radius:10px;overflow:hidden}
.wc-vc-group-hdr{display:flex;align-items:center;gap:6px;padding:10px 12px;background:var(--bg-card,#f8f8f8);cursor:pointer;user-select:none}
.wc-vc-arrow{font-size:12px;transition:transform .2s;display:inline-block}
.wc-vc-arrow:not(.collapsed){transform:rotate(90deg)}
.wc-vc-group-title{flex:1;font-size:0.85rem;font-weight:600;color:var(--text-main,#333)}
.wc-vc-del-group{font-size:0.72rem;color:#e55;background:none;border:1px solid #e55;border-radius:4px;padding:2px 8px;cursor:pointer;opacity:.7}
.wc-vc-del-group:hover{opacity:1;background:#fee}
.wc-vc-cards{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px}
.wc-vc-chip{display:inline-flex;align-items:center;gap:2px;background:var(--bg-chip,#eef2ff);border:1px solid var(--border-chip,#c5cae9);border-radius:16px;padding:4px 10px;font-size:0.78rem;color:var(--text-main,#333)}
.wc-vc-chip .vc-del{background:none;border:none;color:#999;font-size:14px;cursor:pointer;padding:0 0 0 2px;line-height:1}
.wc-vc-chip .vc-del:hover{color:#e55}
.wc-vc-add-row{display:flex;gap:6px;padding:6px 12px 10px}
.wc-vc-add-row input{flex:1;border:1px solid var(--border,#ddd);border-radius:6px;padding:6px 10px;font-size:0.82rem;background:var(--bg-input,#fff);color:var(--text-main,#333)}
.wc-vc-add-row button{background:var(--accent,#5b6abf);color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:0.9rem;cursor:pointer}
.wc-vc-batch{padding:0 12px 10px}
.wc-vc-batch-toggle{background:none;border:none;color:var(--accent,#5b6abf);font-size:0.76rem;cursor:pointer;padding:0;text-decoration:underline;opacity:.8}
.wc-vc-batch-toggle:hover{opacity:1}
.wc-vc-batch textarea{width:100%;border:1px solid var(--border,#ddd);border-radius:6px;padding:8px;font-size:0.8rem;margin-top:6px;resize:vertical;background:var(--bg-input,#fff);color:var(--text-main,#333);box-sizing:border-box}
.wc-vc-batch-submit{margin-top:6px;background:var(--accent,#5b6abf);color:#fff;border:none;border-radius:6px;padding:6px 16px;font-size:0.8rem;cursor:pointer}
.wc-vc-add-group-btn{display:block;width:100%;padding:10px;background:none;border:1px dashed var(--border,#ccc);border-radius:10px;color:var(--text-ghost,#999);font-size:0.82rem;cursor:pointer;margin-top:4px}
.wc-vc-add-group-btn:hover{border-color:var(--accent,#5b6abf);color:var(--accent,#5b6abf)}
.wc-vc-mix-row{display:flex;align-items:center;gap:8px;padding:10px 12px;margin-bottom:8px;background:var(--bg-card,#f8f8f8);border-radius:10px;border:1px solid var(--border,#e0e0e0)}
.wc-vc-mix-label{font-size:0.84rem;font-weight:600;color:var(--text-main,#333)}
.wc-vc-mix-hint{flex:1;font-size:0.72rem;color:var(--text-ghost,#999);text-align:right;margin-right:4px}
.wc-vc-mix-toggle{position:relative;width:44px;height:24px;border-radius:12px;border:none;background:#ccc;cursor:pointer;padding:0;transition:background .2s;flex-shrink:0}
.wc-vc-mix-toggle.on{background:#4caf50}
.wc-vc-mix-knob{position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.2);transition:transform .2s}
.wc-vc-mix-toggle.on .wc-vc-mix-knob{transform:translateX(20px)}
/* ── 来电界面 ── */
.wc-incoming-call{position:fixed;top:0;left:0;right:0;bottom:0;z-index:600;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff}
.wc-incoming-call .ic-bg{position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(135deg,#1a1a2e,#16213e,#0f3460);z-index:0}
.wc-incoming-call .ic-bg img{width:100%;height:100%;object-fit:cover;filter:blur(25px) brightness(0.35);transform:scale(1.15)}
.wc-incoming-call .ic-content{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:12px}
.wc-incoming-call .ic-avatar{width:100px;height:100px;border-radius:50%;overflow:hidden;border:3px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:2.2rem}
.wc-incoming-call .ic-avatar img{width:100%;height:100%;object-fit:cover}
.wc-incoming-call .ic-name{font-size:1.3rem;font-weight:500;margin-top:8px}
.wc-incoming-call .ic-label{font-size:0.85rem;opacity:0.7;animation:wcCallPulse 1.5s ease-in-out infinite}
.wc-incoming-call .ic-btns{display:flex;gap:60px;margin-top:50px}
.wc-incoming-call .ic-btn{display:flex;flex-direction:column;align-items:center;gap:8px}
.wc-incoming-call .ic-btn-circle{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .15s}
.wc-incoming-call .ic-btn-circle:active{transform:scale(.9)}
.wc-incoming-call .ic-btn-circle.reject{background:#e74c3c}
.wc-incoming-call .ic-btn-circle.accept{background:#07c160}
.wc-incoming-call .ic-btn-circle svg{width:28px;height:28px}
.wc-incoming-call .ic-btn-label{font-size:0.75rem;opacity:0.8}
@keyframes icRing{0%,100%{transform:rotate(0)}10%{transform:rotate(15deg)}20%{transform:rotate(-15deg)}30%{transform:rotate(10deg)}40%{transform:rotate(-10deg)}50%{transform:rotate(0)}}
.wc-incoming-call .ic-avatar{animation:icRing 2s ease-in-out infinite}
.wc-vc-toggle{font-size:0.7rem;padding:2px 8px;border-radius:10px;border:1px solid #4caf50;color:#4caf50;background:none;cursor:pointer;white-space:nowrap}
.wc-vc-toggle.on{background:#4caf50;color:#fff}
.wc-vc-toggle:not(.on){border-color:#999;color:#999}
.wc-vc-group-section.vc-disabled{opacity:.55}
.wc-vc-group-section.vc-disabled .wc-vc-cards{pointer-events:none}
`;
    document.head.appendChild(s);
  })();

  var s = document.createElement("style");
  s.textContent = `
.wc-quote-bar{display:flex;align-items:stretch;gap:6px;margin-bottom:6px;padding:4px 8px;border-radius:4px;background:rgba(140,160,200,0.08);border-left:2px solid rgba(140,160,200,0.4);cursor:default;max-width:100%;overflow:hidden}
.wc-quote-bar .wc-quote-name{font-size:0.7rem;color:var(--accent);white-space:nowrap;font-weight:500}
.wc-quote-bar .wc-quote-text{font-size:0.72rem;color:var(--text-ghost);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px}
[data-theme=dark] .wc-quote-bar{background:rgba(200,198,198,0.06);border-left-color:rgba(140,160,200,0.3)}
.wc-quote-preview{display:flex;align-items:center;gap:8px;padding:6px 14px;border-top:1px solid var(--glass-border);background:rgba(140,160,200,0.04);font-size:0.75rem;color:var(--text-ghost);animation:wcQuoteIn 0.2s ease}
.wc-quote-preview .wc-qp-line{width:2px;min-height:18px;background:var(--accent);border-radius:1px;flex-shrink:0}
.wc-quote-preview .wc-qp-body{flex:1;overflow:hidden}
.wc-quote-preview .wc-qp-name{font-size:0.68rem;color:var(--accent);font-weight:500}
.wc-quote-preview .wc-qp-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wc-quote-preview .wc-qp-close{background:none;border:none;color:var(--text-ghost);font-size:1rem;cursor:pointer;padding:0 4px;opacity:0.6}
@keyframes wcQuoteIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
.wc-ctx-menu{position:absolute;z-index:200;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.15);padding:4px 0;min-width:80px;animation:wcCtxIn 0.15s ease}
.wc-ctx-menu button{display:block;width:100%;padding:8px 16px;background:none;border:none;color:var(--text-secondary);font-size:0.82rem;text-align:left;cursor:pointer}
.wc-ctx-menu button:hover{background:rgba(140,160,200,0.1)}
[data-theme=dark] .wc-ctx-menu{background:rgba(20,25,35,0.95);box-shadow:0 4px 20px rgba(0,0,0,0.4)}
@keyframes wcCtxIn{from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}}
.wc-msg-row .wc-msg-user,.wc-msg-row .wc-msg-reply{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.wc-stk-picker-label{cursor:pointer;user-select:none;display:flex;align-items:center;gap:4px}
.wc-stk-picker-label::before{content:'▾';font-size:0.6rem;transition:transform 0.2s;display:inline-block}
.wc-stk-picker-label.collapsed::before{transform:rotate(-90deg)}

.wc-stk-picker-row.collapsed{display:none}
.wc-voice-bubble{display:inline-flex;align-items:center;gap:6px;padding:7px 12px;min-width:60px;max-width:140px;cursor:pointer;border-radius:8px;position:relative}
.wc-voice-bubble .wc-voice-waves{display:flex;align-items:center;gap:2px;height:14px}
.wc-voice-bubble .wc-voice-wave{width:2.5px;border-radius:2px;background:currentColor;opacity:0.6}
.is-user .wc-voice-bubble .wc-voice-wave{background:#fff}
.wc-voice-bubble .wc-voice-wave:nth-child(1){height:6px}
.wc-voice-bubble .wc-voice-wave:nth-child(2){height:10px}
.wc-voice-bubble .wc-voice-wave:nth-child(3){height:14px}
.wc-voice-bubble.playing .wc-voice-wave{animation:wcVoiceWave 1s ease-in-out infinite}
.wc-voice-bubble.playing .wc-voice-wave:nth-child(1){animation-delay:0s}
.wc-voice-bubble.playing .wc-voice-wave:nth-child(2){animation-delay:0.15s}
.wc-voice-bubble.playing .wc-voice-wave:nth-child(3){animation-delay:0.3s}
@keyframes wcVoiceWave{0%,100%{height:5px;opacity:0.4}50%{height:14px;opacity:0.9}}
.wc-voice-duration{font-size:0.7rem;opacity:0.7;white-space:nowrap}
.is-user .wc-voice-bubble{flex-direction:row-reverse}
.wc-voice-text{font-size:0.72rem;color:var(--text-ghost);margin-top:3px;line-height:1.3;max-width:160px;word-break:break-all}
.is-user .wc-voice-text{text-align:right}
.wc-mic-btn{background:none;border:none;color:var(--text-ghost);padding:4px;cursor:pointer;flex-shrink:0;opacity:0.7;transition:opacity 0.2s}
.wc-mic-btn:hover,.wc-mic-btn.active{opacity:1;color:var(--accent)}
.wc-mic-btn.active svg{color:#e74c3c}
.wc-record-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:300;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px)}
.wc-record-box{text-align:center;color:#fff}
.wc-record-indicator{width:60px;height:60px;border-radius:50%;background:rgba(231,76,60,0.8);margin:0 auto 12px;display:flex;align-items:center;justify-content:center;animation:wcRecPulse 1s ease-in-out infinite}
.wc-record-indicator svg{width:28px;height:28px;fill:#fff}
@keyframes wcRecPulse{0%,100%{transform:scale(1);opacity:0.8}50%{transform:scale(1.15);opacity:1}}
.wc-record-time{font-size:1.2rem;font-weight:500;margin-bottom:6px}
.wc-record-hint{font-size:0.75rem;opacity:0.7}
.wc-record-cancel{font-size:0.8rem;color:#e74c3c;margin-top:8px;opacity:0}
.wc-record-box.cancelling .wc-record-indicator{background:rgba(150,150,150,0.8);animation:none}
.wc-record-box.cancelling .wc-record-cancel{opacity:1}
.wc-hold-btn{display:none;flex:1;height:36px;border-radius:6px;border:1px solid var(--glass-border);background:var(--glass-bg);color:var(--text-secondary);font-size:0.85rem;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:none}
.wc-hold-btn:active{background:rgba(231,76,60,0.1)}
.wc-vc-section{padding:8px 0}
.wc-vc-group-tabs{display:flex;gap:6px;padding:0 0 8px;overflow-x:auto;-webkit-overflow-scrolling:touch}
.wc-vc-group-tab{padding:4px 12px;border-radius:14px;font-size:0.75rem;border:1px solid var(--glass-border);background:transparent;color:var(--text-secondary);cursor:pointer;white-space:nowrap;flex-shrink:0}
.wc-vc-group-tab.active{background:var(--accent);color:#fff;border-color:var(--accent)}
.wc-vc-group-tab.add-group{border-style:dashed;color:var(--text-ghost)}
.wc-vc-cards{display:flex;flex-wrap:wrap;gap:6px;max-height:40vh;overflow-y:auto;padding:4px 0}
.wc-vc-chip{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:12px;font-size:0.76rem;background:var(--glass-bg);border:1px solid var(--glass-border);color:var(--text-primary)}
.wc-vc-chip .vc-del{background:none;border:none;color:var(--text-ghost);cursor:pointer;font-size:0.85rem;padding:0 0 0 2px;line-height:1}
.wc-vc-chip .vc-del:hover{color:#e74c3c}
.wc-vc-add-row{display:flex;gap:6px;margin-top:8px}
.wc-vc-add-row input{flex:1;height:32px;border-radius:16px;border:1px solid var(--glass-border);background:var(--glass-bg);color:var(--text-primary);padding:0 12px;font-size:0.8rem;outline:none}
.wc-vc-add-row button{height:32px;padding:0 14px;border-radius:16px;border:none;background:var(--accent);color:#fff;font-size:0.8rem;cursor:pointer}
.wc-vc-count{font-size:0.72rem;color:var(--text-ghost);padding:4px 0}
.wc-vc-del-group{font-size:0.7rem;color:var(--text-ghost);background:none;border:none;cursor:pointer;margin-left:auto;padding:2px 8px}
.wc-vc-del-group:hover{color:#e74c3c}
.wc-vc-group-header{display:flex;align-items:center;padding:2px 0 6px}
.wc-vc-divider{border:none;border-top:1px solid var(--glass-border);margin:12px 0 8px}
.wc-vc-title{font-size:0.82rem;font-weight:500;color:var(--text-primary)}
.wc-call-choose{position:fixed;top:0;left:0;right:0;bottom:0;z-index:400;background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center}
.wc-call-choose-box{background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:14px;padding:20px 28px;text-align:center}
.wc-call-choose-title{font-size:0.85rem;color:var(--text-secondary);margin-bottom:16px}
.wc-call-choose-btns{display:flex;gap:36px;justify-content:center}
.wc-call-choose-item{display:flex;flex-direction:column;align-items:center;gap:6px;cursor:pointer;padding:8px;border-radius:10px;transition:background 0.15s}
.wc-call-choose-item:active{background:rgba(140,160,200,0.12)}
.wc-call-choose-item .icon{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1.5px solid var(--text-ghost)}
.wc-call-choose-item .icon svg{width:20px;height:20px;stroke:var(--text-secondary);fill:none;stroke-width:1.8}
.wc-call-choose-item .label{font-size:0.72rem;color:var(--text-ghost)}
[data-theme=dark] .wc-call-choose-box{background:rgba(20,25,35,0.95)}
/* ── WeChat 风格通话浮窗 ── */
.wc-call-float{position:fixed;z-index:999;cursor:pointer;user-select:none;animation:wcFloatIn .25s ease;touch-action:none}
@keyframes wcFloatIn{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
/* 语音：绿色胶囊 */
.wc-call-float.voice{top:60px;right:12px;display:flex;align-items:center;gap:6px;padding:6px 12px 6px 10px;background:#07c160;border-radius:20px;color:#fff;font-size:0;box-shadow:0 2px 12px rgba(0,0,0,.25)}
.wc-call-float.voice .cf-icon{width:18px;height:18px;flex-shrink:0}
.wc-call-float.voice .cf-icon svg{width:18px;height:18px}
.wc-call-float.voice .cf-timer{font-size:.75rem;font-weight:500;font-variant-numeric:tabular-nums;letter-spacing:.03em}
/* 视频：小浮窗 */
.wc-call-float.video{top:60px;right:12px;width:100px;height:140px;border-radius:12px;overflow:hidden;background:#000;box-shadow:0 4px 20px rgba(0,0,0,.35);border:2px solid rgba(255,255,255,.15)}
.wc-call-float.video .cf-video-bg{width:100%;height:100%;object-fit:cover}
.wc-call-float.video .cf-video-overlay{position:absolute;bottom:0;left:0;right:0;padding:4px 0;text-align:center;background:linear-gradient(transparent,rgba(0,0,0,.6));color:#fff}
.wc-call-float.video .cf-timer{font-size:.68rem;font-variant-numeric:tabular-nums}
.wc-call-float.video .cf-name{font-size:.6rem;opacity:.8;margin-bottom:1px}
/* 拖动中 */
.wc-call-float.dragging{opacity:.85;transition:none!important}
.wc-call-fullscreen{position:fixed;top:0;left:0;right:0;bottom:0;z-index:500;display:flex;flex-direction:column;align-items:center;justify-content:space-between;color:#fff;overflow:hidden}
.wc-call-fullscreen.voice-call{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)}
.wc-call-fullscreen.video-call{background:#000}
.wc-call-bg{position:absolute;top:0;left:0;right:0;bottom:0;background-size:cover;background-position:center;filter:blur(20px) brightness(0.4);transform:scale(1.1)}
.wc-call-top{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;z-index:1;padding-top:80px}
.wc-call-avatar{width:90px;height:90px;border-radius:50%;overflow:hidden;border:2px solid rgba(255,255,255,0.25);margin-bottom:14px;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:1.8rem}
.wc-call-avatar img{width:100%;height:100%;object-fit:cover}
.wc-call-name{font-size:1.2rem;font-weight:500;margin-bottom:6px}
.wc-call-status{font-size:0.82rem;opacity:0.7}
.wc-call-status.connecting{animation:wcCallPulse 1.5s ease-in-out infinite}
@keyframes wcCallPulse{0%,100%{opacity:0.4}50%{opacity:1}}
.wc-call-fs-timer{font-size:1rem;font-weight:300;opacity:0.8;margin-top:4px;font-variant-numeric:tabular-nums}
.wc-call-bottom{z-index:1;padding-bottom:50px;display:flex;flex-direction:column;align-items:center;gap:16px;flex:0 0 auto}
.wc-call-btns{display:flex;gap:36px}
.wc-call-btn{width:56px;height:56px;border-radius:50%;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform 0.15s;background:rgba(255,255,255,0.15)}
.wc-call-btn:active{transform:scale(0.9)}
.wc-call-btn svg{width:24px;height:24px}
.wc-call-btn.hangup{background:#e74c3c}
.wc-call-btn.active{background:rgba(255,255,255,0.45)}
.wc-call-minimize{background:none;border:none;color:rgba(255,255,255,0.6);font-size:0.75rem;cursor:pointer;padding:6px 16px;border-radius:16px;border:1px solid rgba(255,255,255,0.2)}
.wc-call-minimize:active{background:rgba(255,255,255,0.1)}
.wc-call-video-main{position:absolute;top:0;left:0;right:0;bottom:0;z-index:0}
.wc-call-video-main img{width:100%;height:100%;object-fit:cover;filter:brightness(0.6)}
.wc-call-video-pip{position:absolute;top:50px;right:16px;width:90px;height:130px;border-radius:10px;overflow:hidden;z-index:2;background:#1a1a2e;border:2px solid rgba(255,255,255,0.15)}
.wc-call-video-pip video{width:100%;height:100%;object-fit:cover}
.wc-call-video-pip .pip-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:0.65rem;opacity:0.4}

.wc-call-reply-box{z-index:2;width:88%;max-width:340px;margin:0 auto;padding:0;border-radius:14px;backdrop-filter:blur(12px);max-height:40vh;overflow-y:auto;-webkit-overflow-scrolling:touch;display:none;flex-direction:column;gap:10px}
.wc-call-reply-box.has-content{display:flex;padding:14px 18px;background:rgba(0,0,0,0.3)}
.wc-call-reply-item{color:rgba(255,255,255,0.9);font-size:0.84rem;line-height:1.65;word-break:break-all;animation:wcReplyFadeIn 0.4s ease}
.wc-call-reply-item:not(:last-child){opacity:0.45;font-size:0.8rem}
.wc-call-reply-item:nth-last-child(2){opacity:0.65}
.wc-call-reply-item.typing{text-align:center;opacity:0.5;animation:wcCallTyping 1.2s infinite}
@keyframes wcReplyFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes wcCallTyping{0%,100%{opacity:0.3}50%{opacity:0.7}}
.wc-call-input-dialog{z-index:10;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:75%;max-width:280px;background:rgba(255,255,255,0.95);border-radius:14px;overflow:hidden;animation:wcDialogIn 0.2s ease;box-shadow:0 8px 32px rgba(0,0,0,0.4)}
@keyframes wcDialogIn{from{opacity:0;transform:translate(-50%,-50%) scale(0.9)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
.wc-call-input-dialog .dialog-title{text-align:center;font-size:0.85rem;color:#333;padding:16px 16px 8px;font-weight:500}
.wc-call-input-dialog .dialog-body{padding:0 16px 12px}
.wc-call-input-dialog .dialog-body input{width:100%;height:36px;border:1px solid #ddd;border-radius:8px;padding:0 12px;font-size:0.85rem;outline:none;box-sizing:border-box;color:#333}
.wc-call-input-dialog .dialog-body input:focus{border-color:#999}
.wc-call-input-dialog .dialog-body input::placeholder{color:#aaa}
.wc-call-input-dialog .dialog-btns{display:flex;border-top:1px solid #e5e5e5}
.wc-call-input-dialog .dialog-btns button{flex:1;height:42px;border:none;background:transparent;font-size:0.85rem;cursor:pointer;color:#333}
.wc-call-input-dialog .dialog-btns button:first-child{border-right:1px solid #e5e5e5;color:#999}
.wc-call-input-dialog .dialog-btns button:last-child{color:#333;font-weight:500}
.wc-call-input-dialog .dialog-btns button:active{background:rgba(0,0,0,0.05)}

.wc-call-sys-msg{text-align:center;font-size:0.72rem;color:var(--text-ghost);padding:6px 0;opacity:0.7}

.wc-input-voice-mode #wc-input{display:none}
.wc-input-voice-mode .wc-hold-btn{display:flex;align-items:center;justify-content:center}
.wc-voice-wrapper{display:flex;flex-direction:column}
.is-user .wc-voice-wrapper{align-items:flex-end}
.wc-stk-group-header{cursor:pointer}
.wc-stk-group-info{user-select:none;display:flex;align-items:center}
.wc-stk-group-info::before{content:'▾';font-size:0.6rem;margin-right:4px;transition:transform 0.2s;display:inline-block}
.wc-stk-group.collapsed .wc-stk-group-info::before{transform:rotate(-90deg)}
#wc-tab-stickers .wc-stk-group.collapsed .wc-stk-grid{display:none}
#wc-tab-stickers .wc-stk-grid{display:flex;flex-wrap:wrap;gap:6px;padding:6px 14px 12px}
#wc-tab-stickers .wc-stk-item{width:56px;height:56px;border-radius:8px;overflow:hidden;cursor:pointer;aspect-ratio:auto}
#wc-tab-stickers .wc-stk-item img{width:100%;height:100%;object-fit:cover}
#wc-tab-stickers>.wc-sticker-grid{display:none!important}
.wc-chat-container{background:linear-gradient(135deg,#d4dce8,#e0d8ec)!important;background-color:transparent!important}
[data-theme="dark"] .wc-chat-container{background:linear-gradient(135deg,#1a0a3a,#0a1a2e)!important;background-color:transparent!important}
.wc-chat-container.has-custom-bg{background:transparent!important}
.wc-sticker-panel .wc-stk-picker-row{display:flex;flex-wrap:wrap;gap:6px;padding:4px 14px 8px}
.wc-sticker-panel .wc-sticker-item{width:60px;height:60px;border-radius:8px;overflow:hidden;cursor:pointer;flex-shrink:0}
.wc-sticker-panel .wc-sticker-item img{width:100%;height:100%;object-fit:cover}
`;
  document.head.appendChild(s);
})();
// 字卡传讯 — 聊天界面（含自定义卡管理 + 头像系统）
document.addEventListener('DOMContentLoaded', () => {

  const STORAGE_KEY = 'wc-chat-history';
  const AVATAR_KEY = 'wc-avatars';

  function showScreenById(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  // 容错：word-cards.js 可能未加载完
  if (typeof WordCardEngine === "undefined") { console.warn("WordCardEngine not loaded, using fallback"); window.WordCardEngine = class { constructor(){ this.history=[]; this.usedTexts=new Set(); } draw(){ return null; } reset(){ this.history=[]; this.usedTexts.clear(); } setCustomCards(){} setCardMode(){} getCardMode(){ return "default"; } }; }
  const wordDeck = typeof WordCardEngine !== 'undefined' ? new WordCardEngine() : { reset:function(){}, usedTexts:new Set(), drawCards:function(){return[];}, setCustomCards:function(){}, setCardMode:function(){}, cardMode:'default', commitCards:function(){}, drawCandidates:function(){return[];}, drawFromPoolNames:function(){return[];} };
  let busy = false;
  let chatMessages = [];
  let messageQueue = [];

  // ─── 头像系统 ───
  let avatarData = { me: null, ta: null, taName: '' };
  let currentAvatarTarget = null; // 'me' or 'ta'

  function loadAvatarData() {
    try {
      const raw = localStorage.getItem(AVATAR_KEY);
      if (raw) Object.assign(avatarData, JSON.parse(raw));
    } catch(e) {}
  }

  function saveAvatarData() {
    localStorage.setItem(AVATAR_KEY, JSON.stringify(avatarData));
    // 同步到当前聊天的 profile（列表页显示用）
    if (currentChatId) {
      localStorage.setItem('wc-chat-profile-' + currentChatId, JSON.stringify({
        ta: avatarData.ta || null,
        taName: avatarData.taName || ''
      }));
    }
  }

  function getMyNickname() {
    var selfInfo = typeof getActivePersonaInfo === 'function' ? getActivePersonaInfo('self') : null;
    if (selfInfo && selfInfo.name) return selfInfo.name;
    if (typeof Auth !== 'undefined' && Auth.getUser) {
      const u = Auth.getUser();
      if (u && u.nickname) return u.nickname;
    }
    return '我';
  }

  function getTaNickname() {
    var dreamInfo = typeof getActivePersonaInfo === 'function' ? getActivePersonaInfo('dream') : null;
    if (dreamInfo && dreamInfo.name) return dreamInfo.name;
    return avatarData.taName || '';
  }

  const DEFAULT_AVATAR_DARK = '/images/avatar-default-dark.png';
  const DEFAULT_AVATAR_LIGHT = '/images/avatar-default-light.png';

  function getDefaultAvatar() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return isDark ? DEFAULT_AVATAR_DARK : DEFAULT_AVATAR_LIGHT;
  }

  function getAvatarSrc(who) {
    if (who === 'me') {
      var selfInfo = typeof getActivePersonaInfo === 'function' ? getActivePersonaInfo('self') : null;
      if (selfInfo && selfInfo.avatar_url) return selfInfo.avatar_url;
    } else if (who === 'ta') {
      var dreamInfo = typeof getActivePersonaInfo === 'function' ? getActivePersonaInfo('dream') : null;
      if (dreamInfo && dreamInfo.avatar_url) return dreamInfo.avatar_url;
    }
    return avatarData[who] || getDefaultAvatar();
  }

  // 读取指定 chatId 的 ta 头像（用于列表页）
  function getChatTaAvatar(chatId) {
    try {
      var raw = localStorage.getItem('wc-chat-profile-' + chatId);
      if (raw) { var o = JSON.parse(raw); if (o.ta) return o.ta; }
    } catch(e) {}
    return getDefaultAvatar();
  }

  function getChatTaNickname(chatId) {
    try {
      var raw = localStorage.getItem('wc-chat-profile-' + chatId);
      if (raw) { var o = JSON.parse(raw); return o.taName || ''; }
    } catch(e) {}
    return '';
  }

  function refreshHeaderAvatars() {
    loadAvatarData();
    const meImg = document.getElementById('wc-avatar-me-img');
    const meDef = document.getElementById('wc-avatar-me-default');
    const taImg = document.getElementById('wc-avatar-ta-img');
    const taDef = document.getElementById('wc-avatar-ta-default');
    const meNameEl = document.getElementById('wc-name-me');
    const taNameEl = document.getElementById('wc-name-ta');

    meImg.src = getAvatarSrc('me');
    meImg.classList.add('active');
    meDef.style.display = 'none';

    taImg.src = getAvatarSrc('ta');
    taImg.classList.add('active');
    taDef.style.display = 'none';

    meNameEl.textContent = getMyNickname();
    taNameEl.textContent = getTaNickname();
  }

  function buildMsgAvatarHtml(type) {
    const isUser = type === 'user';
    const src = isUser ? getAvatarSrc('me') : getAvatarSrc('ta');
    return '<img src="' + src + '" alt="">';
  }

  // 头像点击 → 选图
  const avatarFileInput = document.getElementById('wc-avatar-file');
  // TA 头像点击换头像
  var _el=document.getElementById('wc-avatar-ta'); if(_el) _el.addEventListener('click', (e) => {
    e.stopPropagation();
    currentAvatarTarget = 'ta';
    avatarFileInput.click();
  });
  // 用户头像（隐藏的）也支持
  var _el=document.getElementById('wc-avatar-me'); if(_el) _el.addEventListener('click', () => {
    currentAvatarTarget = 'me';
    avatarFileInput.click();
  });
  // 点击顶栏名字区域 → 设置昵称
  var _el=document.getElementById('wc-header-profile'); if(_el) _el.addEventListener('click', () => {
    showNicknameModal();
  });

  if (avatarFileInput) {
    avatarFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file || !currentAvatarTarget) return;
      const reader = new FileReader();
      reader.onload = () => {
        // 压缩到 128x128
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = 128; c.height = 128;
          const ctx = c.getContext('2d');
          const s = Math.min(img.width, img.height);
          const sx = (img.width - s) / 2;
          const sy = (img.height - s) / 2;
          ctx.drawImage(img, sx, sy, s, s, 0, 0, 128, 128);
          const dataUrl = c.toDataURL('image/jpeg', 0.8);
          avatarData[currentAvatarTarget] = dataUrl;
          saveAvatarData();
          refreshHeaderAvatars();
          refreshAllMsgAvatars();
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
      avatarFileInput.value = '';
    });
  }

  // TA 昵称点击 → 弹窗（备用，profile click 也触发）
  var _el=document.getElementById('wc-name-ta'); if(_el) _el.addEventListener('click', (e) => {
    e.stopPropagation();
    showNicknameModal();
  });

  function showNicknameModal() {
    // 移除已有弹窗
    (function(_e){if(_e)_e.remove()})(document.querySelector('.wc-nickname-modal'));
    const modal = document.createElement('div');
    modal.className = 'wc-nickname-modal';
    modal.innerHTML = `
      <div class="wc-nickname-box">
        <label>TA 的昵称</label>
        <input type="text" maxlength="20" placeholder="可以不填" value="${getTaNickname()}">
        <div class="wc-nickname-actions">
          <button class="wc-nick-cancel">取消</button>
          <button class="wc-nick-save">确定</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const input = modal.querySelector('input');
    input.focus();
    input.select();
    modal.querySelector('.wc-nick-cancel').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    const save = () => {
      avatarData.taName = input.value.trim();
      saveAvatarData();
      refreshHeaderAvatars();
      modal.remove();
    };
    modal.querySelector('.wc-nick-save').addEventListener('click', save);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
  }

  function refreshAllMsgAvatars() {
    document.querySelectorAll('.wc-msg-row .wc-msg-avatar').forEach(el => {
      const row = el.closest('.wc-msg-row');
      const isUser = row.classList.contains('is-user');
      el.innerHTML = buildMsgAvatarHtml(isUser ? 'user' : 'reply');
    });
  }

  let currentChatId = null;
  loadAvatarData();

  // ─── 对话管理（微信风格） ───
  let savePending = false;

  // 自动保存到服务端（防抖 1.5s）
  let saveTimer = null;
  function saveChat() {
    // localStorage 即时存
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: chatMessages, usedTexts: [...wordDeck.usedTexts] }));
    } catch(e) {}
    // 服务端防抖存
    if (!isLoggedIn() || !currentChatId) return;
    clearTimeout(saveTimer);
    savePending = true;
    saveTimer = setTimeout(async () => {
      try {
        const saveRes = await fetch('/api/wc-chats/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ id: currentChatId, messages: chatMessages, usedTexts: [...wordDeck.usedTexts] })
        });
        const saveData = await saveRes.json();
        if (saveData.full) alert(saveData.fullMessage || '对话已满，请开新对话框哦');
      } catch(e) {}
      savePending = false;
    }, 1500);
  }

  // 强制立即保存（离开对话时）
  async function saveChatNow() {
    clearTimeout(saveTimer);
    if (!isLoggedIn() || !currentChatId || chatMessages.length === 0) return;
    try {
      const saveRes2 = await fetch('/api/wc-chats/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ id: currentChatId, messages: chatMessages, usedTexts: [...wordDeck.usedTexts] })
      });
      const saveData2 = await saveRes2.json();
      if (saveData2.full) alert(saveData2.fullMessage || '对话已满，请开新对话框哦');
    } catch(e) {}
  }

  // 加载对话列表
  async function loadChatList() {
    const listEl = document.getElementById('wc-chat-list');
    const emptyEl = document.getElementById('wc-list-empty');
    if (!isLoggedIn()) {
      listEl.innerHTML = '';
      emptyEl.style.display = '';
      emptyEl.innerHTML = '登录后可保存对话';
      return;
    }
    try {
      const res = await fetch('/api/wc-chats', { headers: authHeaders() });
      const data = await res.json();
      const chats = data.chats || [];
      listEl.innerHTML = '';
      if (chats.length === 0) {
        emptyEl.style.display = '';
        return;
      }
      emptyEl.style.display = 'none';
      for (const chat of chats) {
        listEl.appendChild(buildListItem(chat));
      }
      // 如果有未读则保留按钮红点，否则清除
      const anyUnread = chats.some(c => c.unreadCount > 0);
      const btnBadge = document.getElementById('wc-btn-badge');
      if (btnBadge) btnBadge.style.display = anyUnread ? 'block' : 'none';
    } catch(e) {
      console.warn('load chat list failed:', e);
    }
    updateSelfAvatar();
  }

  function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000 && d.getDate() === now.getDate()) {
      return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
    }
    if (diff < 86400000 * 2) return '昨天';
    if (diff < 86400000 * 7) return ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()];
    return (d.getMonth()+1) + '/' + d.getDate();
  }

  function buildListItem(chat) {
    const item = document.createElement('div');
    item.className = 'wc-list-item';
    item.dataset.id = chat.id;
    item.innerHTML = `
      <div class="wc-list-item-inner">
        <div class="wc-list-item-avatar"><img src="${chat.dreamPersonaAvatar || getChatTaAvatar(chat.id)}" alt=""></div>
        <div class="wc-list-item-body">
          <div class="wc-list-item-top">
            <span class="wc-list-item-name">${chat.dreamPersonaName || getChatTaNickname(chat.id) || chat.title || '新对话'}</span>
            <span class="wc-list-item-time">${formatTime(chat.updatedAt)}</span>
          </div>
          <div class="wc-list-item-bottom"><span class="wc-list-item-preview">${chat.messageCount || 0} 条消息</span>${chat.unreadCount > 0 ? '<span class="wc-unread-badge">' + chat.unreadCount + '</span>' : ''}</div>
        </div>
      </div>
      <div class="wc-list-item-del">删除</div>
    `;
    // 点击打开
    item.querySelector('.wc-list-item-inner').addEventListener('click', () => openChat(chat.id));
    // 左滑删除
    let startX = 0, moved = false;
    item.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; moved = false; });
    item.addEventListener('touchmove', (e) => {
      const dx = e.touches[0].clientX - startX;
      if (dx < -30) { item.classList.add('swiped'); moved = true; }
      if (dx > 20) item.classList.remove('swiped');
    });
    item.querySelector('.wc-list-item-del').addEventListener('click', async () => {
      try {
        await fetch('/api/wc-chats/' + chat.id, { method: 'DELETE', headers: authHeaders() });
        item.remove();
        const remaining = document.querySelectorAll('.wc-list-item');
        if (remaining.length === 0) document.getElementById('wc-list-empty').style.display = '';
      } catch(e) {}
    });
    // 桌面端右键或长按也能删
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      item.classList.toggle('swiped');
    });
    return item;
  }

  // ═══ 语音字卡系统（IIFE 顶层，供 openChat 和 mode-tab 共用）═══
  let voiceCardData = null;
  let vcMixTextCards = false;
  let vcActiveGroup = 'default';

  async function initVoiceCards() {
    if (!isLoggedIn()) return;
    try {
      const res = await fetch('/api/voice-cards', { headers: authHeaders() });
      if (!res.ok) return;
      voiceCardData = await res.json();
      vcMixTextCards = !!voiceCardData.mixTextCards;
      // 数据加载完，如果语音卡面板可见就立即渲染
      var voiceEl = document.getElementById('wc-card-voice-content');
      if (voiceEl && voiceEl.style.display !== 'none') renderVoiceCards();
    } catch(e) { console.warn('load voice cards failed:', e); }
  }

  // 记录每组折叠状态
  let vcExpanded = {};

  function renderVoiceCards() {
    var container = document.getElementById('wc-voice-cards-section');
    if (!container || !voiceCardData) return;
    container.innerHTML = '';

    // 混合文字卡开关
    var mixRow = document.createElement('div');
    mixRow.className = 'wc-vc-mix-row';
    var mixLabel = document.createElement('span');
    mixLabel.className = 'wc-vc-mix-label';
    mixLabel.textContent = '通话时混合文字卡';
    var mixHint = document.createElement('span');
    mixHint.className = 'wc-vc-mix-hint';
    mixHint.textContent = vcMixTextCards ? '语音卡 + 文字卡' : '仅语音卡';
    var mixToggle = document.createElement('button');
    mixToggle.className = 'wc-vc-mix-toggle' + (vcMixTextCards ? ' on' : '');
    mixToggle.innerHTML = '<span class="wc-vc-mix-knob"></span>';
    mixToggle.addEventListener('click', async function() {
      try {
        var r = await fetch('/api/voice-cards/mix-text', { method: 'POST', headers: authHeaders() });
        var d = await r.json();
        vcMixTextCards = d.mixTextCards;
        renderVoiceCards();
      } catch(e) {}
    });
    mixRow.appendChild(mixLabel);
    mixRow.appendChild(mixHint);
    mixRow.appendChild(mixToggle);
    container.appendChild(mixRow);

    voiceCardData.groups.forEach(function(g) {
      var section = document.createElement('div');
      section.className = 'wc-vc-group-section';
      var enabled = g.enabled !== false; // 默认开启
      if (!enabled) section.classList.add('vc-disabled');

      // 组头部
      var header = document.createElement('div');
      header.className = 'wc-vc-group-hdr';
      var collapsed = !vcExpanded[g.id];

      var arrow = document.createElement('span');
      arrow.className = 'wc-vc-arrow' + (collapsed ? ' collapsed' : '');
      arrow.textContent = '▸';
      header.appendChild(arrow);

      var title = document.createElement('span');
      title.className = 'wc-vc-group-title';
      title.textContent = g.name + '（' + g.cards.length + '）';
      header.appendChild(title);

      // 开关按钮
      var toggleBtn = document.createElement('button');
      toggleBtn.className = 'wc-vc-toggle' + (enabled ? ' on' : '');
      toggleBtn.textContent = enabled ? '已开启' : '已关闭';
      toggleBtn.addEventListener('click', async function(e) {
        e.stopPropagation();
        try {
          var r = await fetch('/api/voice-cards/group/' + g.id + '/toggle', { method: 'POST', headers: authHeaders() });
          var d = await r.json();
          g.enabled = d.enabled;
          renderVoiceCards();
        } catch(e2) {}
      });
      header.appendChild(toggleBtn);

      // 删除按钮（所有卡组）
      var delBtn = document.createElement('button');
      delBtn.className = 'wc-vc-del-group';
      delBtn.textContent = '删除';
      delBtn.addEventListener('click', async function(e) {
        e.stopPropagation();
        if (!confirm('确定删除「' + g.name + '」卡组及所有卡片？')) return;
        try {
          await fetch('/api/voice-cards/group/' + g.id, { method: 'DELETE', headers: authHeaders() });
          voiceCardData.groups = voiceCardData.groups.filter(function(x) { return x.id !== g.id; });
          renderVoiceCards();
        } catch(e2) {}
      });
      header.appendChild(delBtn);

      // 点击头部折叠/展开
      header.addEventListener('click', function(e) {
        if (e.target.closest('.wc-vc-toggle') || e.target.closest('.wc-vc-del-group')) return;
        vcExpanded[g.id] = !vcExpanded[g.id];
        renderVoiceCards();
      });
      section.appendChild(header);

      // 折叠时不渲染内容
      if (!collapsed) {
        // 卡片芯片
        var cardsDiv = document.createElement('div');
        cardsDiv.className = 'wc-vc-cards';
        if (g.cards.length === 0) {
          cardsDiv.innerHTML = '<div style="color:var(--text-ghost);font-size:0.78rem;padding:8px 0;text-align:center;width:100%">暂无卡片</div>';
        } else {
          g.cards.forEach(function(card) {
            var chip = document.createElement('div');
            chip.className = 'wc-vc-chip';
            var span = document.createElement('span');
            span.textContent = card.text;
            var del = document.createElement('button');
            del.className = 'vc-del';
            del.textContent = '\u00d7';
            del.addEventListener('click', async function() {
              try {
                var r = await fetch('/api/voice-cards/' + card.id, { method: 'DELETE', headers: authHeaders() });
                if (r.ok) { g.cards = g.cards.filter(function(c) { return c.id !== card.id; }); renderVoiceCards(); }
              } catch(e3) {}
            });
            chip.appendChild(span);
            chip.appendChild(del);
            cardsDiv.appendChild(chip);
          });
        }
        section.appendChild(cardsDiv);

        // 单条添加
        var addRow = document.createElement('div');
        addRow.className = 'wc-vc-add-row';
        var addInput = document.createElement('input');
        addInput.type = 'text'; addInput.placeholder = '添加语音卡（≤30字）'; addInput.maxLength = 30;
        var addBtn = document.createElement('button');
        addBtn.textContent = '+';
        async function doAdd() {
          var text = addInput.value.trim();
          if (!text || text.length > 30) return;
          addInput.value = '';
          try {
            var r = await fetch('/api/voice-cards', {
              method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
              body: JSON.stringify({ text: text, groupId: g.id })
            });
            var d = await r.json();
            if (d.card) { g.cards.push(d.card); renderVoiceCards(); }
          } catch(e4) {}
        }
        addBtn.addEventListener('click', doAdd);
        addInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') doAdd(); });
        addRow.appendChild(addInput);
        addRow.appendChild(addBtn);
        section.appendChild(addRow);

        // 批量添加
        var batchRow = document.createElement('div');
        batchRow.className = 'wc-vc-batch';
        var batchToggle = document.createElement('button');
        batchToggle.className = 'wc-vc-batch-toggle';
        batchToggle.textContent = '批量添加（一行一个）';
        var batchPanel = document.createElement('div');
        batchPanel.style.display = 'none';
        var batchTa = document.createElement('textarea');
        batchTa.placeholder = '一行一张卡（≤30字/行）';
        batchTa.rows = 4;
        var batchBtn = document.createElement('button');
        batchBtn.textContent = '确认添加';
        batchBtn.className = 'wc-vc-batch-submit';
        batchToggle.addEventListener('click', function() {
          batchPanel.style.display = batchPanel.style.display === 'none' ? '' : 'none';
        });
        batchBtn.addEventListener('click', async function() {
          var lines = batchTa.value.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0 && l.length <= 30; });
          if (lines.length === 0) return;
          batchBtn.disabled = true; batchBtn.textContent = '添加中...';
          try {
            var r = await fetch('/api/voice-cards', {
              method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
              body: JSON.stringify({ texts: lines, groupId: g.id })
            });
            var d = await r.json();
            if (d.added > 0) {
              batchTa.value = '';
              var r2 = await fetch('/api/voice-cards', { headers: authHeaders() });
              if (r2.ok) voiceCardData = await r2.json();
              renderVoiceCards();
            }
          } catch(e5) {}
          batchBtn.disabled = false; batchBtn.textContent = '确认添加';
        });
        batchPanel.appendChild(batchTa);
        batchPanel.appendChild(batchBtn);
        batchRow.appendChild(batchToggle);
        batchRow.appendChild(batchPanel);
        section.appendChild(batchRow);
      }
      container.appendChild(section);
    });

    // 新建卡组
    var addGroupBtn = document.createElement('button');
    addGroupBtn.className = 'wc-vc-add-group-btn';
    addGroupBtn.textContent = '+ 新建卡组';
    addGroupBtn.addEventListener('click', async function() {
      var name = prompt('卡组名称：');
      if (!name || !name.trim()) return;
      try {
        var r = await fetch('/api/voice-cards/group', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ name: name.trim() })
        });
        var d = await r.json();
        if (d.group) {
          voiceCardData.groups.push({ id: d.group.id, name: d.group.name, cards: [] });
          renderVoiceCards();
        } else { alert(d.error || '创建失败'); }
      } catch(e6) {}
    });
    container.appendChild(addGroupBtn);
  }



  // ═══ 默认字卡池系统（IIFE 顶层）═══
  let wordPoolData = null;
  let wpExpanded = {};
  const POOL_CN = {"scenes":"场景","time":"时间","dreams":"梦境","clothing":"穿着","food":"食物","body":"身体感觉","eating":"吃喝动作","daily":"日常动作","love":"恋爱表达","fearSad":"害怕伤心","happy":"开心","coming":"来去动作","simplePos":"正面简词","simpleNeg":"负面简词","emoji":"表情符号","petNames":"称呼","intimate":"亲密动作","care":"关心","meta":"对话相关","jealous":"吃醋","banter":"调侃玩笑","cuddly":"撒娇","surrender":"服软","comfort":"安慰","lovebabble":"情话","missyou":"想念","stickySweet":"黏黏甜甜","possessive":"占有欲","sweetDaily":"甜蜜日常","confess":"表白","goofyCute":"搞怪可爱","worryCare":"担心关怀","apology":"道歉","sadUpset":"难过"};

  async function initWordPools() {
    if (!isLoggedIn()) return;
    try {
      var res = await fetch('/api/word-pools', { headers: authHeaders() });
      if (!res.ok) return;
      var data = await res.json();
      if (data.groups) {
        wordPoolData = data;
      } else {
        // 首次：从客户端 _POOLS 初始化
        if (typeof _POOLS === 'undefined') return;
        var groups = [];
        for (var key in _POOLS) {
          if (!_POOLS.hasOwnProperty(key)) continue;
          var pool = _POOLS[key];
          var cards = pool.texts.map(function(t) {
            return { id: Math.random().toString(36).substr(2, 9), text: t };
          });
          groups.push({ id: key, name: POOL_CN[key] || key, enabled: true, cards: cards });
        }
        // 发送到服务器保存
        var initRes = await fetch('/api/word-pools/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ groups: groups })
        });
        if (initRes.ok) {
          wordPoolData = { groups: groups };
        }
      }
      // 同步关闭的卡池到引擎
      if (wordPoolData && wordPoolData.groups) {
        var disabled = wordPoolData.groups.filter(function(g) { return g.enabled === false; }).map(function(g) { return g.id; });
        wordDeck.setDisabledPools(disabled);
      }
      // 如果字卡池面板可见就渲染
      var poolEl = document.getElementById('wc-word-pools-section');
      if (poolEl && poolEl.style.display !== 'none') renderWordPools();
    } catch(e) { console.warn('load word pools failed:', e); }
  }

  function renderWordPools() {
    var container = document.getElementById('wc-word-pools-section');
    if (!container || !wordPoolData) return;
    container.innerHTML = '';

    wordPoolData.groups.forEach(function(g) {
      var section = document.createElement('div');
      section.className = 'wc-vc-group-section';
      var enabled = g.enabled !== false;
      if (!enabled) section.classList.add('vc-disabled');

      // 组头部
      var header = document.createElement('div');
      header.className = 'wc-vc-group-hdr';
      var collapsed = !wpExpanded[g.id];

      var arrow = document.createElement('span');
      arrow.className = 'wc-vc-arrow' + (collapsed ? ' collapsed' : '');
      arrow.textContent = '▸';
      header.appendChild(arrow);

      var title = document.createElement('span');
      title.className = 'wc-vc-group-title';
      title.textContent = g.name + '（' + g.cards.length + '）';
      header.appendChild(title);

      // 开关按钮
      var toggleBtn = document.createElement('button');
      toggleBtn.className = 'wc-vc-toggle' + (enabled ? ' on' : '');
      toggleBtn.textContent = enabled ? '已开启' : '已关闭';
      toggleBtn.addEventListener('click', async function(e) {
        e.stopPropagation();
        try {
          var r = await fetch('/api/word-pools/group/' + g.id + '/toggle', { method: 'POST', headers: authHeaders() });
          var d = await r.json();
          g.enabled = d.enabled;
          // 同步到引擎
          var disabled = wordPoolData.groups.filter(function(x) { return x.enabled === false; }).map(function(x) { return x.id; });
          wordDeck.setDisabledPools(disabled);
          renderWordPools();
        } catch(e2) {}
      });
      header.appendChild(toggleBtn);

      // 删除按钮
      var delBtn = document.createElement('button');
      delBtn.className = 'wc-vc-del-group';
      delBtn.textContent = '删除';
      delBtn.addEventListener('click', async function(e) {
        e.stopPropagation();
        if (!confirm('确定删除「' + g.name + '」卡组及' + g.cards.length + '张卡片？')) return;
        try {
          await fetch('/api/word-pools/group/' + g.id, { method: 'DELETE', headers: authHeaders() });
          wordPoolData.groups = wordPoolData.groups.filter(function(x) { return x.id !== g.id; });
          renderWordPools();
        } catch(e2) {}
      });
      header.appendChild(delBtn);

      // 点击头部折叠/展开
      header.addEventListener('click', function(e) {
        if (e.target.closest('.wc-vc-toggle') || e.target.closest('.wc-vc-del-group')) return;
        wpExpanded[g.id] = !wpExpanded[g.id];
        renderWordPools();
      });
      section.appendChild(header);

      if (!collapsed) {
        // 卡片芯片
        var cardsDiv = document.createElement('div');
        cardsDiv.className = 'wc-vc-cards';
        if (g.cards.length === 0) {
          cardsDiv.innerHTML = '<div style="color:var(--text-ghost);font-size:0.78rem;padding:8px 0;text-align:center;width:100%">暂无卡片</div>';
        } else {
          g.cards.forEach(function(card) {
            var chip = document.createElement('div');
            chip.className = 'wc-vc-chip';
            var span = document.createElement('span');
            span.textContent = card.text;
            var del = document.createElement('button');
            del.className = 'vc-del';
            del.textContent = '\u00d7';
            del.addEventListener('click', async function() {
              try {
                var r = await fetch('/api/word-pools/card/' + card.id, { method: 'DELETE', headers: authHeaders() });
                if (r.ok) { g.cards = g.cards.filter(function(c) { return c.id !== card.id; }); renderWordPools(); }
              } catch(e3) {}
            });
            chip.appendChild(span);
            chip.appendChild(del);
            cardsDiv.appendChild(chip);
          });
        }
        section.appendChild(cardsDiv);

        // 单条添加
        var addRow = document.createElement('div');
        addRow.className = 'wc-vc-add-row';
        var addInput = document.createElement('input');
        addInput.type = 'text'; addInput.placeholder = '添加字卡（≤20字）'; addInput.maxLength = 20;
        var addBtn = document.createElement('button');
        addBtn.textContent = '+';
        async function doAdd() {
          var text = addInput.value.trim();
          if (!text || text.length > 20) return;
          addInput.value = '';
          try {
            var r = await fetch('/api/word-pools/card', {
              method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
              body: JSON.stringify({ text: text, groupId: g.id })
            });
            var d = await r.json();
            if (d.card) { g.cards.push(d.card); renderWordPools(); }
          } catch(e4) {}
        }
        addBtn.addEventListener('click', doAdd);
        addInput.addEventListener('keydown', function(e) { if (e.key === 'Enter') doAdd(); });
        addRow.appendChild(addInput);
        addRow.appendChild(addBtn);
        section.appendChild(addRow);

        // 批量添加
        var batchRow = document.createElement('div');
        batchRow.className = 'wc-vc-batch';
        var batchToggle = document.createElement('button');
        batchToggle.className = 'wc-vc-batch-toggle';
        batchToggle.textContent = '批量添加（一行一个）';
        var batchPanel = document.createElement('div');
        batchPanel.style.display = 'none';
        var batchTa = document.createElement('textarea');
        batchTa.placeholder = '一行一张卡（≤20字/行）';
        batchTa.rows = 4;
        var batchBtn = document.createElement('button');
        batchBtn.textContent = '确认添加';
        batchBtn.className = 'wc-vc-batch-submit';
        batchToggle.addEventListener('click', function() {
          batchPanel.style.display = batchPanel.style.display === 'none' ? '' : 'none';
        });
        batchBtn.addEventListener('click', async function() {
          var lines = batchTa.value.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0 && l.length <= 20; });
          if (lines.length === 0) return;
          batchBtn.disabled = true; batchBtn.textContent = '添加中...';
          try {
            var r = await fetch('/api/word-pools/card', {
              method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
              body: JSON.stringify({ texts: lines, groupId: g.id })
            });
            var d = await r.json();
            if (d.added > 0) {
              batchTa.value = '';
              var r2 = await fetch('/api/word-pools', { headers: authHeaders() });
              if (r2.ok) wordPoolData = await r2.json();
              renderWordPools();
            }
          } catch(e5) {}
          batchBtn.disabled = false; batchBtn.textContent = '确认添加';
        });
        batchPanel.appendChild(batchTa);
        batchPanel.appendChild(batchBtn);
        batchRow.appendChild(batchToggle);
        batchRow.appendChild(batchPanel);
        section.appendChild(batchRow);
      }
      container.appendChild(section);
    });

    // 新建卡组
    var addGroupBtn = document.createElement('button');
    addGroupBtn.className = 'wc-vc-add-group-btn';
    addGroupBtn.textContent = '+ 新建卡组';
    addGroupBtn.addEventListener('click', async function() {
      var name = prompt('卡组名称：');
      if (!name || !name.trim()) return;
      try {
        var r = await fetch('/api/word-pools/group', {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ name: name.trim() })
        });
        var d = await r.json();
        if (d.group) {
          wordPoolData.groups.push({ id: d.group.id, name: d.group.name, enabled: true, cards: [] });
          renderWordPools();
        } else { alert(d.error || '创建失败'); }
      } catch(e6) {}
    });
    container.appendChild(addGroupBtn);
  }

  // 打开一个对话
  async function openChat(chatId) {
    currentChatId = chatId;
    chatMessages = [];
    wordDeck.reset();
    const msgArea = document.getElementById('wc-chat-messages');
    msgArea.innerHTML = '<div class="wc-system-msg">想对 TA 说什么？</div>';
    showScreenById('screen-wordcard-input');
    refreshHeaderAvatars();
    updateSelfAvatar();
    // 同步头像到 per-chat profile（确保列表页能显示）
    if (avatarData.ta || avatarData.taName) {
      localStorage.setItem('wc-chat-profile-' + chatId, JSON.stringify({
        ta: avatarData.ta || null,
        taName: avatarData.taName || ''
      }));
    }
    initCustomCards();

  initWordPools();
  initVoiceCards();

    loadStickers();
    try {
      const res = await fetch('/api/wc-chats/' + chatId, { headers: authHeaders() });
      const data = await res.json();
      if (data.usedTexts) {
        for (const t of data.usedTexts) wordDeck.usedTexts.add(t);
      }
      chatMessages = data.messages || [];
      msgArea.innerHTML = '<div class="wc-system-msg">想对 TA 说什么？</div>';
      let lastAt = null;
      for (const msg of chatMessages) {
        // 主动消息加时间分隔
        if (msg.proactive && msg.at && msg.at !== lastAt) {
          const d = new Date(msg.at);
          const timeStr = d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
          const sep = document.createElement('div');
          sep.className = 'wc-time-sep';
          sep.textContent = timeStr;
          msgArea.appendChild(sep);
          lastAt = msg.at;
        }
        appendMsgDom(msg.text, msg.type, msgArea, msg.msgType, msg.quote, msg.voiceUrl ? { voiceUrl: msg.voiceUrl, duration: msg.duration } : undefined);
      }
      scrollToBottom();
      // Apply visual settings from chat data
      if (data.settings) {
        currentChatSettings = {
          bgPreset: data.settings.bgPreset || 'none',
          bgImage: data.settings.bgImage || null,
          bubbleTheme: data.settings.bubbleTheme || 'default',
          hueRotate: data.settings.hueRotate || 0,
          myBubbleColor: data.settings.myBubbleColor || 'default',
          taBubbleColor: data.settings.taBubbleColor || 'default'
        };
        applyChatVisualSettings(currentChatSettings);
      } else {
        currentChatSettings = {};
        applyChatVisualSettings({});
      }
      // If chat has bound persona, set it as active for AI calls
      if (data.dreamPersonaId) {
        localStorage.setItem('active_dream_id', data.dreamPersonaId);
        if (data.dreamPersonaName || data.dreamPersonaAvatar) {
          localStorage.setItem('active_dream_info', JSON.stringify({
            name: data.dreamPersonaName || '', avatar_url: data.dreamPersonaAvatar || '', summary: ''
          }));
        }
        // Also set header avatar/name from persona
        var taImg = document.getElementById('wc-avatar-ta-img');
        var taDef = document.getElementById('wc-avatar-ta-default');
        var taNameEl = document.getElementById('wc-name-ta');
        if (data.dreamPersonaAvatar && taImg) { taImg.src = data.dreamPersonaAvatar; taImg.style.display = ''; if (taDef) taDef.style.display = 'none'; }
        if (data.dreamPersonaName && taNameEl) taNameEl.textContent = data.dreamPersonaName;
      }
    } catch(e) { console.warn('load chat failed:', e); }
    refreshHeaderAvatars();
    document.getElementById('wc-input').focus();
  }

  // 新建对话
  async function createNewChat() {
    if (!isLoggedIn()) {
      // 未登录：直接进聊天（localStorage 模式）
      currentChatId = null;
      chatMessages = [];
      wordDeck.reset();
      const msgArea = document.getElementById('wc-chat-messages');
      msgArea.innerHTML = '<div class="wc-system-msg">想对 TA 说什么？</div>';
      showScreenById('screen-wordcard-input');
      refreshHeaderAvatars();
      updateSelfAvatar();
      document.getElementById('wc-input').focus();
      return;
    }
    try {
      const res = await fetch('/api/wc-chats', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() } });
      const data = await res.json();
      if (data.id) {
        openChat(data.id);
      }
    } catch(e) { console.warn('create chat failed:', e); }
  }

  // 兼容旧 localStorage 数据
  function loadChat() {
    if (isLoggedIn()) return; // 登录用户走服务端
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data.messages || data.messages.length === 0) return;
      if (data.usedTexts) {
        for (const t of data.usedTexts) wordDeck.usedTexts.add(t);
      }
      chatMessages = data.messages;
    } catch (e) {}
  }

  loadChat();
  refreshHeaderAvatars();

  // ─── 自定义卡管理 ───
  const manageBtn = document.getElementById('btn-wc-manage');
  // cardPanel merged into settings panel
  const cardListEl = document.getElementById('wc-card-list');
  const cardCountEl = document.getElementById('wc-card-count');
  let userCards = [];

  function authHeaders() {
    if (typeof Auth !== 'undefined' && Auth.authHeaders) return Auth.authHeaders();
    const token = localStorage.getItem('fizz_token');
    return token ? { 'Authorization': 'Bearer ' + token } : {};
  }

  function isLoggedIn() {
    if (typeof Auth !== 'undefined' && Auth.isLoggedIn) return Auth.isLoggedIn();
    return !!localStorage.getItem('fizz_token');
  }

  // 初始化：已登录则显示管理按钮 + 加载自定义卡
  async function initCustomCards() {
    if (!isLoggedIn()) {
      if (manageBtn) manageBtn.style.display = 'none';
      return;
    }
    if (manageBtn) manageBtn.style.display = '';

    try {
      const res = await fetch('/api/custom-cards', { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      userCards = data.cards || [];
      wordDeck.setCustomCards(userCards);
      wordDeck.setCardMode(data.mode || 'default');
      updateCardList();
      updateModeBadge();
      updateModeTabs(data.mode || 'default');
      if (userCards.length > 0 && manageBtn) manageBtn.classList.add('has-custom');
    } catch (e) { console.warn('load custom cards failed:', e); }
  }

  initCustomCards();

  // 初始化默认字卡池 DOM
  (function setupWordPoolsDOM() {
    var normalContent = document.getElementById('wc-card-normal-content');
    if (!normalContent) return;
    // 把现有内容包进 custom section
    var customSection = document.createElement('div');
    customSection.id = 'wc-custom-cards-section';
    customSection.style.display = 'none'; // 默认隐藏（默认卡 tab 先显示卡池）
    while (normalContent.firstChild) customSection.appendChild(normalContent.firstChild);
    normalContent.appendChild(customSection);
    // 添加卡池 section
    var poolSection = document.createElement('div');
    poolSection.id = 'wc-word-pools-section';
    normalContent.insertBefore(poolSection, customSection);
    // 加载卡池数据
    initWordPools();
  })();

  // 打开/关闭面板（统一面板）
  // manageBtn removed from HTML, card panel merged into settings panel

  // 模式切换 tabs
  document.querySelectorAll('.wc-mode-tab').forEach(tab => {
    tab.addEventListener('click', async () => {
      const mode = tab.dataset.mode;
      updateModeTabs(mode);
      // 切换普通卡 / 语音卡面板
      var normalEl = document.getElementById('wc-card-normal-content');
      var voiceEl = document.getElementById('wc-card-voice-content');
      if (normalEl) normalEl.style.display = mode === 'voice' ? 'none' : '';
      if (voiceEl) voiceEl.style.display = mode === 'voice' ? '' : 'none';
      if (mode === 'voice') {
        if (voiceCardData) {
          renderVoiceCards();
        } else {
          initVoiceCards().then(function() { renderVoiceCards(); });
        }
        return;
      }
      // 默认卡显示卡池分组
      var poolSection = document.getElementById('wc-word-pools-section');
      var customSection = document.getElementById('wc-custom-cards-section');
      if (mode === 'default') {
        if (poolSection) poolSection.style.display = '';
        if (customSection) customSection.style.display = 'none';
        if (wordPoolData) { renderWordPools(); }
        else { initWordPools().then(function() { renderWordPools(); }); }
      } else {
        if (poolSection) poolSection.style.display = 'none';
        if (customSection) customSection.style.display = '';
      }
      wordDeck.setCardMode(mode);
      updateModeBadge();
      try {
        await fetch('/api/card-mode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ mode }),
        });
      } catch (e) {}
    });
  });

  function updateModeTabs(mode) {
    document.querySelectorAll('.wc-mode-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.mode === mode);
    });
  }

  function updateModeBadge() {
    const header = document.querySelector('.wc-header-center');
    if (!header) return;
    let badge = header.querySelector('.wc-mode-badge');
    const mode = wordDeck.cardMode;
    if (mode === 'default') {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'wc-mode-badge';
      badge.style.cssText = 'font-size:0.55rem;color:var(--text-ghost);letter-spacing:0.08em;';
      header.appendChild(badge);
    }
    badge.textContent = mode === 'custom' ? '我的卡组' : '混合';
  }

  // 添加单张卡
  const addInput = document.getElementById('wc-add-input');
  const addBtn = document.getElementById('btn-wc-add');
  if (addBtn) addBtn.addEventListener('click', addSingleCard);
  if (addInput) addInput.addEventListener('keydown', e => { if (e.key === 'Enter') addSingleCard(); });

  async function addSingleCard() {
    const text = (addInput ? addInput.value : '').trim();
    if (!text || text.length > 20) return;
    addInput.value = '';
    try {
      const res = await fetch('/api/custom-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.card) {
        userCards.push(data.card);
        wordDeck.setCustomCards(userCards);
        updateCardList();
        if (manageBtn) manageBtn.classList.add('has-custom');
      }
    } catch (e) {}
  }

  // 批量添加
  const batchToggle = document.getElementById('btn-wc-batch-toggle');
  const batchArea = document.getElementById('wc-batch-area');
  if (batchToggle) {
    batchToggle.addEventListener('click', () => {
      batchArea.style.display = batchArea.style.display === 'none' ? '' : 'none';
    });
  }

  const batchAddBtn = document.getElementById('btn-wc-batch-add');
  if (batchAddBtn) {
    batchAddBtn.addEventListener('click', async () => {
      const textarea = document.getElementById('wc-batch-input');
      const lines = (textarea ? textarea.value : '').split('\n').map(s => s.trim()).filter(s => s && s.length <= 20);
      if (lines.length === 0) return;
      textarea.value = '';
      try {
        const res = await fetch('/api/custom-cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ texts: lines }),
        });
        const data = await res.json();
        if (data.added > 0) await initCustomCards();
      } catch (e) {}
    });
  }

  // 删除卡
  async function deleteCard(cardId) {
    try {
      const res = await fetch('/api/custom-cards/' + cardId, { method: 'DELETE', headers: authHeaders() });
      if (res.ok) {
        userCards = userCards.filter(c => c.id !== cardId);
        wordDeck.setCustomCards(userCards);
        updateCardList();
        if (userCards.length === 0) {
          if (manageBtn) manageBtn.classList.remove('has-custom');
          if (wordDeck.cardMode === 'custom') {
            wordDeck.setCardMode('default');
            updateModeTabs('default');
            updateModeBadge();
          }
        }
      }
    } catch (e) {}
  }

  // 渲染卡片列表
  function updateCardList() {
    if (!cardListEl) return;
    cardListEl.innerHTML = '';
    if (userCards.length === 0) {
      cardListEl.innerHTML = '<div style="color:var(--text-ghost);font-size:0.8rem;padding:20px 0;text-align:center;">还没有自定义卡片</div>';
    } else {
      for (const card of userCards) {
        const chip = document.createElement('div');
        chip.className = 'wc-card-chip';
        const span = document.createElement('span');
        span.textContent = card.text;
        const del = document.createElement('button');
        del.className = 'wc-card-chip-del';
        del.title = '删除';
        del.textContent = '\u00d7';
        del.addEventListener('click', () => deleteCard(card.id));
        chip.appendChild(span);
        chip.appendChild(del);
        cardListEl.appendChild(chip);
      }
    }
    if (cardCountEl) cardCountEl.textContent = userCards.length + ' 张自定义卡';
  }

  // ─── 顶级 Tab 切换（设置 / 卡组 / 表情包） ───
  function switchSettingsTab(tabName) {
    document.querySelectorAll('.wc-top-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.wc-top-tab').forEach(t => { if (t.dataset.panel === tabName) t.classList.add('active'); });
    var allTabs = ['settings', 'cards', 'stickers'];
    allTabs.forEach(function(name) {
      var el = document.getElementById('wc-tab-' + name);
      if (el) el.style.display = name === tabName ? '' : 'none';
    });
    if (tabName === 'stickers' && stickerGroups.length === 0) loadStickers();
  }
  document.querySelectorAll('.wc-top-tab').forEach(tab => {
    tab.addEventListener('click', () => { switchSettingsTab(tab.dataset.panel); });
  });

  // ─── 表情包系统（分组） ───
  let stickerGroups = [];
  let stickerPanelOpen = false;
  let currentUserId = null;
  let activeUploadGroupId = null; // 当前上传目标分组

  function getCurrentUserId() {
    if (currentUserId) return currentUserId;
    try {
      const token = localStorage.getItem('fizz_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        currentUserId = payload.id || payload.sub;
        return currentUserId;
      }
    } catch(e) {}
    return null;
  }

  function stickerUrl(sticker) {
    return '/api/stickers/image/' + getCurrentUserId() + '/' + sticker.filename;
  }

  async function loadStickers() {
    if (!isLoggedIn()) return;
    try {
      const res = await fetch('/api/stickers', { headers: authHeaders() });
      const data = await res.json();
      stickerGroups = data.groups || [];
      renderStickerManager();
      renderStickerPicker();
      renderFloatingStickers();
    } catch(e) { console.warn('load stickers failed:', e); }
  }

  // ── 管理面板：分组列表渲染 ──
  function renderStickerManager() {
    const container = document.getElementById('wc-stk-groups');
    if (!container) return;
    container.innerHTML = '';
    if (stickerGroups.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:var(--text-ghost);font-size:0.78rem;padding:30px 0;">还没有表情包分组</div>';
      return;
    }
    for (const group of stickerGroups) {
      const section = document.createElement('div');
      section.className = 'wc-stk-group' + (group.enabled ? '' : ' disabled');
      section.dataset.id = group.id;

      // 分组头
      const header = document.createElement('div');
      header.className = 'wc-stk-group-header';
      header.innerHTML = `
        <div class="wc-stk-group-info">
          <span class="wc-stk-group-name" title="双击重命名">${group.name}</span>
          <span class="wc-stk-group-count">${group.stickers.length}</span>
        </div>
        <div class="wc-stk-group-actions">
          <label class="wc-stk-group-upload" title="添加表情到此分组">
            <input type="file" accept="image/*" multiple style="display:none;" data-group="${group.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </label>
          <label class="wc-stk-switch">
            <input type="checkbox" ${group.enabled ? 'checked' : ''} data-group="${group.id}">
            <span class="wc-stk-slider"></span>
          </label>
          <button class="wc-stk-group-del" data-group="${group.id}" title="删除分组">&times;</button>
        </div>
      `;

      // 分组名双击重命名
      const nameEl = header.querySelector('.wc-stk-group-name');
      nameEl.addEventListener('dblclick', () => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = group.name;
        input.maxLength = 10;
        input.className = 'wc-stk-rename-input';
        nameEl.replaceWith(input);
        input.focus();
        input.select();
        const save = async () => {
          const newName = input.value.trim() || group.name;
          group.name = newName;
          try {
            await fetch('/api/sticker-groups/' + group.id, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', ...authHeaders() },
              body: JSON.stringify({ name: newName })
            });
          } catch(e) {}
          renderStickerManager();
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
      });

      // 启用/禁用开关
      header.querySelector('input[type="checkbox"]').addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        group.enabled = enabled;
        section.classList.toggle('disabled', !enabled);
        try {
          await fetch('/api/sticker-groups/' + group.id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ enabled })
          });
        } catch(e) {}
        renderStickerPicker();
      });

      // 分组内上传
      header.querySelector('input[type="file"]').addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        activeUploadGroupId = group.id;
        for (const file of files) {
          if (!file.type.startsWith('image/')) continue;
          await uploadSticker(file, group.id);
        }
        e.target.value = '';
        renderStickerManager();
        renderStickerPicker();
      });

      // 删除分组
      header.querySelector('.wc-stk-group-del').addEventListener('click', async () => {
        if (!confirm('删除分组「' + group.name + '」及其所有表情？')) return;
        try {
          await fetch('/api/sticker-groups/' + group.id, { method: 'DELETE', headers: authHeaders() });
          await loadStickers();
        } catch(e) {}
      });

      // 点击分组头折叠/展开（排除操作按钮区域）
      header.querySelector('.wc-stk-group-info').addEventListener('click', () => {
        section.classList.toggle('collapsed');
      });

      section.appendChild(header);

      // 表情网格
      if (group.stickers.length > 0) {
        const grid = document.createElement('div');
        grid.className = 'wc-stk-grid';
        for (const sticker of group.stickers) {
          const item = document.createElement('div');
          item.className = 'wc-stk-item';
          const img = document.createElement('img');
          img.src = stickerUrl(sticker);
          img.alt = '';
          img.loading = 'lazy';
          // 长按/右键删除
          let pressTimer = null;
          item.addEventListener('touchstart', () => {
            pressTimer = setTimeout(() => {
              if (confirm('删除这个表情？')) deleteStickerFromGroup(sticker.id, group);
            }, 600);
          });
          item.addEventListener('touchend', () => clearTimeout(pressTimer));
          item.addEventListener('touchmove', () => clearTimeout(pressTimer));
          item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (confirm('删除这个表情？')) deleteStickerFromGroup(sticker.id, group);
          });
          item.appendChild(img);
          grid.appendChild(item);
        }
        section.appendChild(grid);
      }

      container.appendChild(section);
    }
  }

  async function deleteStickerFromGroup(stickerId, group) {
    try {
      await fetch('/api/stickers/' + stickerId, { method: 'DELETE', headers: authHeaders() });
      group.stickers = group.stickers.filter(s => s.id !== stickerId);
      renderStickerManager();
      renderStickerPicker();
    } catch(e) {}
  }

  // ── 聊天用：底部表情选择器渲染 ──
  function renderStickerPicker() {
    const grid = document.getElementById('wc-sticker-grid');
    const empty = document.getElementById('wc-sticker-empty');
    if (!grid) return;
    grid.innerHTML = '';
    const enabledGroups = stickerGroups.filter(g => g.enabled && g.stickers.length > 0);
    if (enabledGroups.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'wc-sticker-empty';
      emptyDiv.innerHTML = '还没有表情包<br><span style="font-size:0.65rem;opacity:0.5;">在卡组面板 → 表情包中添加</span>';
      grid.appendChild(emptyDiv);
      return;
    }
    for (const group of enabledGroups) {
      // 分组标签（多于1组时显示）
      if (enabledGroups.length > 1) {
        const label = document.createElement('div');
        label.className = 'wc-stk-picker-label';
        label.textContent = group.name;
        grid.appendChild(label);
        // 点击折叠/展开
        label.addEventListener('click', () => {
          label.classList.toggle('collapsed');
          const nextRow = label.nextElementSibling;
          if (nextRow) nextRow.classList.toggle('collapsed');
        });
      }
      const row = document.createElement('div');
      row.className = 'wc-stk-picker-row';
      for (const sticker of group.stickers) {
        const item = document.createElement('div');
        item.className = 'wc-sticker-item';
        const img = document.createElement('img');
        img.src = stickerUrl(sticker);
        img.alt = '';
        img.loading = 'lazy';
        img.addEventListener('click', () => {
          sendSticker(sticker);
          toggleStickerPanel(false);
        });
        item.appendChild(img);
        row.appendChild(item);
      }
      grid.appendChild(row);
    }
  }

  async function uploadSticker(file, groupId) {
    if (!isLoggedIn()) return;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        let dataUrl = reader.result;
        const isGif = file.type === 'image/gif';
        if (!isGif) {
          // 非GIF：canvas压缩
          const img = new Image();
          await new Promise(r => { img.onload = r; img.src = dataUrl; });
          const maxSize = 256;
          let w = img.width, h = img.height;
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
            else { w = Math.round(w * maxSize / h); h = maxSize; }
          }
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          dataUrl = c.toDataURL('image/png', 0.9);
        }
        // GIF直接用原始dataURL，保留动画
        try {
          const res = await fetch('/api/stickers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ image: dataUrl, groupId })
          });
          const data = await res.json();
          if (data.sticker && data.group) {
            const g = stickerGroups.find(gr => gr.id === data.group.id);
            if (g) g.stickers = data.group.stickers;
          } else if (data.error) {
            alert(data.error);
          }
        } catch(e) {}
        resolve();
      };
      reader.readAsDataURL(file);
    });
  }

  function sendSticker(sticker) {
    addMsg(stickerUrl(sticker), 'user', 'sticker');
    messageQueue.push('[表情包]');
  }

  // ── 浮动表情面板渲染 ──
  function renderFloatingStickers() {
    const panel = document.getElementById('wc-sticker-panel');
    if (!panel) return;
    panel.innerHTML = '';
    const enabledGroups = stickerGroups.filter(g => g.enabled && g.stickers.length > 0);
    if (enabledGroups.length === 0) {
      panel.innerHTML = '<div class="wc-sticker-empty">还没有表情包<br><span style="font-size:0.65rem;opacity:0.5;">在卡组面板 → 表情包中添加</span></div>';
      return;
    }
    for (const group of enabledGroups) {
      if (enabledGroups.length > 1) {
        const label = document.createElement('div');
        label.className = 'wc-stk-picker-label';
        label.textContent = group.name;
        panel.appendChild(label);
        label.addEventListener('click', () => {
          label.classList.toggle('collapsed');
          const nextRow = label.nextElementSibling;
          if (nextRow) nextRow.classList.toggle('collapsed');
        });
      }
      const row = document.createElement('div');
      row.className = 'wc-stk-picker-row';
      for (const sticker of group.stickers) {
        const item = document.createElement('div');
        item.className = 'wc-sticker-item';
        const img = document.createElement('img');
        img.src = stickerUrl(sticker);
        img.alt = '';
        img.loading = 'lazy';
        img.addEventListener('click', () => {
          sendSticker(sticker);
          toggleStickerPanel(false);
        });
        item.appendChild(img);
        row.appendChild(item);
      }
      panel.appendChild(row);
    }
  }

  function toggleStickerPanel(show) {
    const panel = document.getElementById('wc-sticker-panel');
    if (show === undefined) show = !stickerPanelOpen;
    stickerPanelOpen = show;
    panel.style.display = show ? 'flex' : 'none';
    if (show) {
      if (stickerGroups.length === 0) loadStickers();
      else renderFloatingStickers();
    }
  }

  // 笑脸按钮 → 弹出选择器
  var _el=document.getElementById('btn-wc-sticker'); if(_el) _el.addEventListener('click', () => {
    if (!isLoggedIn()) {
      alert('登录后可使用表情包');
      return;
    }
    toggleStickerPanel();
  });

  // 顶部工具栏上传（默认传到第一个分组）
  const stickerFileInput = document.getElementById('wc-sticker-file');
  if (stickerFileInput) {
    stickerFileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files);
      const targetGroup = (stickerGroups[0] && stickerGroups[0].id);
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        await uploadSticker(file, targetGroup);
      }
      stickerFileInput.value = '';
      renderStickerManager();
      renderStickerPicker();
    });
  }

  // 新建分组
  var _el=document.getElementById('btn-stk-new-group'); if(_el) _el.addEventListener('click', async () => {
    const name = prompt('分组名称（最多10字）');
    if (!name || !name.trim()) return;
    try {
      const res = await fetch('/api/sticker-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name: name.trim() })
      });
      const data = await res.json();
      if (data.group) {
        stickerGroups.push(data.group);
        renderStickerManager();
        renderStickerPicker();
      }
    } catch(e) {}
  });

  // 点击外部关闭表情选择器
  document.addEventListener('click', (e) => {
    if (!stickerPanelOpen) return;
    const panel = document.getElementById('wc-sticker-panel');
    const btn = document.getElementById('btn-wc-sticker');
    if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      toggleStickerPanel(false);
    }
  });

  // ─── 导航 ───
  // 主页 → 对话列表（登录）或直接进聊天（未登录）
  // 检查未读并更新按钮红点
  async function checkBtnUnread() {
    if (!isLoggedIn()) return;
    try {
      const res = await fetch('/api/wc-chats/unread', { headers: authHeaders() });
      const data = await res.json();
      const badge = document.getElementById('wc-btn-badge');
      if (badge) badge.style.display = data.hasUnread ? 'block' : 'none';
    } catch(e) {}
  }

  document.getElementById('btn-wordcard').addEventListener('click', () => {
    if (isLoggedIn()) {
      showScreenById('screen-wordcard-list');
      loadChatList();
    } else {
      // 未登录：直接进单聊天
      currentChatId = null;
      chatMessages = [];
      loadChat();
      const msgArea = document.getElementById('wc-chat-messages');
      msgArea.innerHTML = '<div class="wc-system-msg">想对 TA 说什么？</div>';
      for (const msg of chatMessages) appendMsgDom(msg.text, msg.type, msgArea, msg.msgType, msg.quote);
      showScreenById('screen-wordcard-input');
      refreshHeaderAvatars();
      document.getElementById('wc-input').focus();
    }
  });




  // ─── Per-chat 设置面板 ───
  const chatSettingsBtn = document.getElementById('btn-wc-chat-settings');
  const chatSettingsPanel = document.getElementById('wc-chat-settings-panel');

  if (chatSettingsBtn) {
    chatSettingsBtn.addEventListener('click', () => {
      if (chatSettingsPanel.style.display === 'none') {
        chatSettingsPanel.style.display = 'flex';
        switchSettingsTab('settings');
        loadChatSettings();
        loadProfileSection();
      } else {
        chatSettingsPanel.style.display = 'none';
      }
    });
  }

  var _settingsPanelClose = document.getElementById('btn-wc-settings-panel-close');
  if (_settingsPanelClose) _settingsPanelClose.addEventListener('click', () => {
    chatSettingsPanel.style.display = 'none';
  });

  // ─── TA Profile 编辑（per-chat） ───
  function loadProfileSection() {
    var img = document.getElementById('wc-profile-avatar-img');
    var placeholder = document.querySelector('.wc-profile-avatar-placeholder');
    var nicknameInput = document.getElementById('wc-profile-nickname');
    if (!img) return;
    // Load current TA avatar/nickname for this chat
    loadAvatarData();
    if (avatarData.ta) {
      img.src = avatarData.ta;
      img.style.display = '';
      if (placeholder) placeholder.style.display = 'none';
    } else {
      img.style.display = 'none';
      if (placeholder) placeholder.style.display = '';
    }
    if (nicknameInput) nicknameInput.value = avatarData.taName || '';
  }

  // Profile avatar upload
  var profileAvatarFile = document.getElementById('wc-profile-avatar-file');
  if (profileAvatarFile) profileAvatarFile.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function() {
      var img = new Image();
      img.onload = function() {
        var size = 200;
        var canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        var ctx = canvas.getContext('2d');
        var sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (sw > sh) { sx = (sw - sh) / 2; sw = sh; }
        else { sy = (sh - sw) / 2; sh = sw; }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
        var dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        avatarData.ta = dataUrl;
        saveAvatarData();
        var previewImg = document.getElementById('wc-profile-avatar-img');
        var placeholder = document.querySelector('.wc-profile-avatar-placeholder');
        if (previewImg) { previewImg.src = dataUrl; previewImg.style.display = ''; }
        if (placeholder) placeholder.style.display = 'none';
        refreshHeaderAvatars();
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  // Profile nickname input
  var profileNickname = document.getElementById('wc-profile-nickname');
  if (profileNickname) {
    var _nickTimer = null;
    profileNickname.addEventListener('input', function() {
      clearTimeout(_nickTimer);
      _nickTimer = setTimeout(function() {
        avatarData.taName = profileNickname.value.trim();
        saveAvatarData();
        refreshHeaderAvatars();
      }, 500);
    });
  }

  async function loadChatSettings() {
    if (!isLoggedIn() || !currentChatId) return;
    try {
      const res = await fetch('/api/wc-chats/' + currentChatId + '/settings', { headers: authHeaders() });
      const data = await res.json();
      document.getElementById('wc-chat-proactive-toggle').checked = data.proactiveEnabled !== false;
      // Load visual settings
      currentChatSettings = {
        bgPreset: data.bgPreset || 'none',
        bgImage: data.bgImage || null,
        bubbleTheme: data.bubbleTheme || 'default',
      hueRotate: data.hueRotate || 0,
        myBubbleColor: data.myBubbleColor || 'default',
        taBubbleColor: data.taBubbleColor || 'default'
      };
      updateSettingsPanelUI(currentChatSettings);
      applyChatVisualSettings(currentChatSettings);
      // Restore bubble style
      if (currentChatSettings.bubbleStyle && currentChatSettings.bubbleStyle !== 'default') {
        applyBubbleStyle(currentChatSettings.bubbleStyle);
      }
    } catch(e) {}
  }

  var _chatProactiveToggle = document.getElementById('wc-chat-proactive-toggle');
  if (_chatProactiveToggle) _chatProactiveToggle.addEventListener('change', async (e) => {
    if (!isLoggedIn() || !currentChatId) return;
    try {
      await fetch('/api/wc-chats/' + currentChatId + '/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ proactiveEnabled: e.target.checked })
      });
    } catch(e) {}
  });

  var _saveScreenshotBtn = document.getElementById('btn-wc-save-screenshot');
  if (_saveScreenshotBtn) _saveScreenshotBtn.addEventListener('click', () => {
    chatSettingsPanel.style.display = 'none';
    saveScreenshot();
  });

  var _clearChatBtn = document.getElementById('btn-wc-clear-chat');
  if (_clearChatBtn) _clearChatBtn.addEventListener("click", () => {
    if (!confirm("确定要清空这段对话吗？清空后无法恢复。")) return;
    chatSettingsPanel.style.display = "none";
    wordDeck.reset();
    chatMessages = [];
    localStorage.removeItem(STORAGE_KEY);
    const msgArea = document.getElementById("wc-chat-messages");
    msgArea.innerHTML = "<div class=\"wc-system-msg\">想对 TA 说什么？</div>";
    saveChat();
  });


  // ═══ Per-chat visual settings: background / bubble style / bubble color ═══

  const BG_PRESETS = {
    none: '',
    starry: 'linear-gradient(135deg, #0a1628 0%, #1a2a4a 50%, #0d1b2e 100%)',
    warm: 'linear-gradient(135deg, #fef3e2 0%, #f6e6d0 50%, #fef9f0 100%)',
    mint: 'linear-gradient(135deg, #e8f5e8 0%, #d4edda 50%, #e8f5e8 100%)',
    dusk: 'linear-gradient(135deg, #1a1025 0%, #2d1b3d 50%, #1a1025 100%)',
    white: '#ffffff',
  };

  const COLOR_PRESETS = {
    default: 'rgba(140,160,200,0.15)',
    mint: 'rgba(120,200,170,0.15)',
    sakura: 'rgba(220,160,180,0.15)',
    amber: 'rgba(220,190,130,0.15)',
    lavender: 'rgba(180,160,220,0.15)',
    coral: 'rgba(220,140,120,0.15)',
    deepsea: 'rgba(80,120,180,0.25)',
    nightpurple: 'rgba(120,80,160,0.25)',
  };

  let currentChatSettings = {};

  function applyChatVisualSettings(settings) {
    const msgArea = document.getElementById('wc-chat-messages');
    const container = document.querySelector('.wc-chat-container');
    if (!msgArea) return;

    // Background — 设在 container 上，header/input 用毛玻璃透出
    var target = container || msgArea;
    var hasBg = false;
    if (settings.bgImage) {
      target.style.setProperty('background-image', 'url(' + settings.bgImage + ')', 'important');
      target.style.setProperty('background-size', 'cover', 'important');
      target.style.setProperty('background-position', 'center', 'important');
      target.style.setProperty('background-repeat', 'no-repeat', 'important');
      target.style.setProperty('background-color', 'transparent', 'important');
      hasBg = true;
    } else if (settings.bgPreset && settings.bgPreset !== 'none' && BG_PRESETS[settings.bgPreset]) {
      var bg = BG_PRESETS[settings.bgPreset];
      if (bg.startsWith('linear-gradient') || bg.startsWith('radial-gradient')) {
        target.style.backgroundImage = bg;
        target.style.backgroundColor = '';
      } else {
        target.style.backgroundImage = 'none';
        target.style.backgroundColor = bg;
      }
      target.style.backgroundSize = '';
      target.style.backgroundPosition = '';
      target.style.backgroundRepeat = '';
      hasBg = true;
    } else {
      target.style.removeProperty('background-image');
      target.style.removeProperty('background-color');
      target.style.removeProperty('background-size');
      target.style.removeProperty('background-position');
      target.style.removeProperty('background-repeat');
    }
    // 有背景时 header/input 变毛玻璃
    if (container) {
      container.classList.toggle('has-custom-bg', hasBg);
    }

    // Bubble theme — add class to messages container
    msgArea.classList.remove('bubble-theme-sweetpink', 'bubble-theme-darknight', 'bubble-theme-classicblue', 'bubble-theme-capsule', 'bubble-theme-imessage');
    if (settings.bubbleTheme && settings.bubbleTheme !== 'default') {
      msgArea.classList.add('bubble-theme-' + settings.bubbleTheme);
    }

    // 色调 — hue-rotate on bubbles
    var hue = parseInt(settings.hueRotate) || 0;
    if (hue > 0) {
      msgArea.style.filter = 'hue-rotate(' + hue + 'deg)';
    } else {
      msgArea.style.filter = '';
    }
  }

  function updateSettingsPanelUI(settings) {
    // Background
    document.querySelectorAll('#wc-bg-options .wc-bg-card, #wc-bg-options .wc-bg-option').forEach(function(o) { o.classList.remove('selected'); });
    var bgKey = settings.bgImage ? 'custom' : (settings.bgPreset || 'none');
    if (bgKey === 'custom') {
      // highlight upload button
      var uploadLabel = document.querySelector('.wc-bg-upload');
      if (uploadLabel) uploadLabel.classList.add('selected');
    } else {
      var bgEl = document.querySelector('#wc-bg-options .wc-bg-option[data-bg="' + bgKey + '"]');
      if (bgEl) bgEl.classList.add('selected');
    }

    // Bubble style
    document.querySelectorAll('#wc-theme-options .wc-theme-option').forEach(function(o) { o.classList.remove('selected'); });
    var styleKey = settings.bubbleStyle || 'round';
    var styleEl = document.querySelector('#wc-theme-options .wc-theme-option[data-style="' + styleKey + '"]');
    if (styleEl) styleEl.classList.add('selected');

    // My color
    document.querySelectorAll('#wc-my-colors .wc-color-option').forEach(function(o) { o.classList.remove('selected'); });
    var myKey = settings.myBubbleColor || 'default';
    var myEl = document.querySelector('#wc-my-colors .wc-color-option[data-color="' + myKey + '"]');
    if (myEl) myEl.classList.add('selected');

    // Ta color
    document.querySelectorAll('#wc-ta-colors .wc-color-option').forEach(function(o) { o.classList.remove('selected'); });
    var taKey = settings.taBubbleColor || 'default';
    var taEl = document.querySelector('#wc-ta-colors .wc-color-option[data-color="' + taKey + '"]');
    if (taEl) taEl.classList.add('selected');
  }

  async function saveChatVisualSetting(partial) {
    if (!isLoggedIn() || !currentChatId) return;
    Object.assign(currentChatSettings, partial);
    try {
      await fetch('/api/wc-chats/' + currentChatId + '/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(partial)
      });
    } catch(e) { console.warn('save visual setting failed:', e); }
  }

  // Background option clicks
  document.querySelectorAll('#wc-bg-options .wc-bg-card:not(.wc-bg-upload), #wc-bg-options .wc-bg-option:not(.wc-bg-upload)').forEach(function(opt) {
    opt.addEventListener('click', function() {
      document.querySelectorAll('#wc-bg-options .wc-bg-option').forEach(function(o) { o.classList.remove('selected'); });
      opt.classList.add('selected');
      currentChatSettings.bgPreset = opt.dataset.bg;
      currentChatSettings.bgImage = null;
      saveChatVisualSetting({ bgPreset: opt.dataset.bg, bgImage: null });
      applyChatVisualSettings(currentChatSettings);
    });
  });

  // Background upload
  var bgUploadInput = document.getElementById('wc-bg-upload');
  if (bgUploadInput) bgUploadInput.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { alert('图片不能超过 20MB'); return; }
    var img = new Image();
    img.onload = function() {
      var maxDim = 1200;
      var w = img.width, h = img.height;
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
        else { w = Math.round(w * maxDim / h); h = maxDim; }
      }
      var canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      var quality = 0.8;
      var dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > 800000 && quality > 0.1) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      document.querySelectorAll('#wc-bg-options .wc-bg-option').forEach(function(o) { o.classList.remove('selected'); });
      var _upEl = document.querySelector('.wc-bg-upload'); if(_upEl) _upEl.classList.add('selected');
      currentChatSettings.bgPreset = 'custom';
      currentChatSettings.bgImage = dataUrl;
      saveChatVisualSetting({ bgPreset: 'custom', bgImage: dataUrl });
      applyChatVisualSettings(currentChatSettings);
    };
    img.src = URL.createObjectURL(file);
  });



  // Bubble style clicks (separate from theme)
  document.querySelectorAll('#wc-bubble-options .wc-theme-option').forEach(function(opt) {
    opt.addEventListener('click', function() {
      document.querySelectorAll('#wc-bubble-options .wc-theme-option').forEach(function(o) { o.classList.remove('selected'); });
      opt.classList.add('selected');
      currentChatSettings.bubbleStyle = opt.dataset.bubble;
      saveChatVisualSetting({ bubbleStyle: opt.dataset.bubble });
      applyBubbleStyle(opt.dataset.bubble);
    });
  });

  function applyBubbleStyle(style) {
    var msgArea = document.getElementById('wc-chat-messages');
    if (!msgArea) return;
    msgArea.classList.remove('bubble-theme-sweetpink', 'bubble-theme-darknight', 'bubble-theme-classicblue', 'bubble-theme-capsule', 'bubble-theme-imessage');
    if (style && style !== 'default') {
      msgArea.classList.add('bubble-theme-' + style);
    }
  }

  // Hue clicks
  document.querySelectorAll('#wc-hue-options .wc-hue-option').forEach(function(opt) {
    opt.addEventListener('click', function() {
      document.querySelectorAll('#wc-hue-options .wc-hue-option').forEach(function(o) { o.classList.remove('selected'); });
      opt.classList.add('selected');
      currentChatSettings.hueRotate = opt.dataset.hue;
      saveChatVisualSetting({ hueRotate: parseInt(opt.dataset.hue) });
      applyChatVisualSettings(currentChatSettings);
    });
  });


  // ═══ End per-chat visual settings ═══


  // 列表页：返回主页
  var _el=document.getElementById('btn-wclist-back'); if(_el) _el.addEventListener('click', () => {
    showScreenById('screen-welcome');
  });

  // 列表页：新建对话 → 打开角色选择面板
  var _el=document.getElementById('btn-wclist-new'); if(_el) _el.addEventListener('click', () => {
    showPersonaPanel();
  });

  // ─── 角色选择面板 ───
  function showPersonaPanel() {
    const panel = document.getElementById('wc-persona-panel');
    if (!panel) { createNewChat(); return; }
    panel.style.display = '';
    // 加载角色卡
    loadPersonaCards();
    requestAnimationFrame(() => {
      panel.querySelector('.wc-persona-panel-sheet').classList.add('wc-pp-sheet-in');
    });
  }

  function hidePersonaPanel() {
    const panel = document.getElementById('wc-persona-panel');
    if (!panel) return;
    const sheet = panel.querySelector('.wc-persona-panel-sheet');
    sheet.classList.remove('wc-pp-sheet-in');
    setTimeout(() => { panel.style.display = 'none'; }, 250);
  }

  // ─── 自我头像 + 切换 ───
  function updateSelfAvatar() {
    var img = document.getElementById('wc-self-ava-img');
    var def = document.getElementById('wc-self-ava-default');
    if (!img) return;
    var selfInfo = typeof getActivePersonaInfo === 'function' ? getActivePersonaInfo('self') : null;
    if (selfInfo && selfInfo.avatar_url) {
      img.src = selfInfo.avatar_url;
      img.style.display = '';
      if (def) def.style.display = 'none';
    } else {
      // 用默认头像图片
      img.src = getDefaultAvatar();
      img.style.display = '';
      if (def) def.style.display = 'none';
    }
  }

  // 点击自我头像 → 打开切换面板
  var _selfAva = document.getElementById('wc-self-ava');
  if (_selfAva) _selfAva.addEventListener('click', function() {
    showSelfPanel();
  });

  function showSelfPanel() {
    var panel = document.getElementById('wc-self-panel');
    if (!panel) return;
    panel.style.display = '';
    loadSelfPersonas();
    requestAnimationFrame(function() {
      panel.querySelector('.wc-persona-panel-sheet').classList.add('wc-pp-sheet-in');
    });
  }

  function hideSelfPanel() {
    var panel = document.getElementById('wc-self-panel');
    if (!panel) return;
    var sheet = panel.querySelector('.wc-persona-panel-sheet');
    sheet.classList.remove('wc-pp-sheet-in');
    setTimeout(function() { panel.style.display = 'none'; }, 250);
  }

  var _selfClose = document.getElementById('wc-self-panel-close');
  if (_selfClose) _selfClose.addEventListener('click', hideSelfPanel);
  var _selfBg = document.querySelector('#wc-self-panel .wc-persona-panel-bg');
  if (_selfBg) _selfBg.addEventListener('click', hideSelfPanel);

  async function loadSelfPersonas() {
    var container = document.getElementById('wc-self-list');
    if (!container) return;
    container.innerHTML = '<div class="wc-pp-loading">加载中...</div>';
    try {
      var res = await fetch('/api/personas', { headers: authHeaders() });
      var data = await res.json();
      var selfs = (data.personas || []).filter(function(p) { return p.type === 'self'; });
      container.innerHTML = '';
      var currentSelfId = localStorage.getItem('active_self_id') || '';
      for (var i = 0; i < selfs.length; i++) {
        var p = selfs[i];
        var row = document.createElement('div');
        row.className = 'wc-pp-row' + (p.id === currentSelfId ? ' wc-pp-row-active' : '');
        var avatarHtml = p.avatar_url
          ? '<img class="wc-pp-row-ava" src="' + p.avatar_url + '" alt="">'
          : '<div class="wc-pp-row-ava wc-pp-row-ava-empty">' + (p.name || '?').charAt(0) + '</div>';
        row.innerHTML = avatarHtml + '<span class="wc-pp-row-name">' + (p.name || '未命名') + '</span>'
          + (p.id === currentSelfId ? '<span class="wc-pp-row-check">✓</span>' : '');
        row.addEventListener('click', (function(persona) {
          return function() {
            localStorage.setItem('active_self_id', persona.id);
            localStorage.setItem('active_self_info', JSON.stringify({
              name: persona.name || '', avatar_url: persona.avatar_url || '', summary: persona.summary || ''
            }));
            updateSelfAvatar();
            hideSelfPanel();
          };
        })(p));
        container.appendChild(row);
      }
      if (selfs.length === 0) {
        container.innerHTML = '<div class="wc-pp-empty">还没有创建自我角色</div>';
      }
    } catch(e) {
      container.innerHTML = '<div class="wc-pp-empty">加载失败</div>';
    }
  }

  // 关闭按钮
  var _ppClose = document.getElementById('wc-pp-close');
  if (_ppClose) _ppClose.addEventListener('click', hidePersonaPanel);

  // 背景点击关闭
  var _ppBg = document.querySelector('.wc-persona-panel-bg');
  if (_ppBg) _ppBg.addEventListener('click', hidePersonaPanel);



  async function loadPersonaCards() {
    const container = document.getElementById('wc-pp-cards');
    if (!container) return;
    container.innerHTML = '<div class="wc-pp-loading">加载中...</div>';
    try {
      const res = await fetch('/api/personas', { headers: authHeaders() });
      const data = await res.json();
      const dreams = (data.personas || []).filter(function(p) { return p.type === 'dream_role'; });
      container.innerHTML = '';
      // 角色列表
      for (var i = 0; i < dreams.length; i++) {
        var p = dreams[i];
        var row = document.createElement('div');
        row.className = 'wc-pp-row';
        var avatarHtml = p.avatar_url
          ? '<img class="wc-pp-row-ava" src="' + p.avatar_url + '" alt="">'
          : '<div class="wc-pp-row-ava wc-pp-row-ava-empty">' + (p.name || '?').charAt(0) + '</div>';
        row.innerHTML = avatarHtml + '<span class="wc-pp-row-name">' + (p.name || '未命名') + '</span>';
        row.addEventListener('click', (function(persona) {
          return function() { selectPersonaForChat(persona); };
        })(p));
        container.appendChild(row);
      }
      // 心灵感应（匿名模式）— 和角色平级
      var anonRow = document.createElement('div');
      anonRow.className = 'wc-pp-row wc-pp-row-anon';
      anonRow.innerHTML = '<div class="wc-pp-row-ava wc-pp-row-ava-anon">✦</div><span class="wc-pp-row-name">心灵感应</span>';
      anonRow.addEventListener('click', function() {
        hidePersonaPanel();
        createNewChat();
      });
      container.appendChild(anonRow);
    } catch(e) {
      container.innerHTML = '<div class="wc-pp-empty">加载失败</div>';
      console.warn('load personas failed:', e);
    }
  }

  async function selectPersonaForChat(persona) {
    hidePersonaPanel();
    if (!isLoggedIn()) { createNewChat(); return; }
    try {
      const res = await fetch('/api/wc-chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          title: persona.name || '新对话',
          dreamPersonaId: persona.id,
          dreamPersonaName: persona.name || '',
          dreamPersonaAvatar: persona.avatar_url || ''
        })
      });
      const data = await res.json();
      if (data.id) {
        // Save persona info for this chat locally too
        localStorage.setItem('wc-chat-profile-' + data.id, JSON.stringify({
          ta: persona.avatar_url || null,
          taName: persona.name || '',
          dreamPersonaId: persona.id
        }));
        // Also set active dream persona
        localStorage.setItem('active_dream_id', persona.id);
        localStorage.setItem('active_dream_info', JSON.stringify({
          name: persona.name || '',
          avatar_url: persona.avatar_url || '',
          summary: persona.summary || ''
        }));
        openChat(data.id);
      }
    } catch(e) { console.warn('create persona chat failed:', e); }
  }

  // 聊天页：返回列表（保存后返回）
  document.getElementById('btn-wordcard-back').addEventListener('click', async () => {
    await saveChatNow();
    if (isLoggedIn()) {
      showScreenById('screen-wordcard-list');
      loadChatList();
    } else {
      showScreenById('screen-welcome');
    }
  });

  // 清空当前对话
  var _resetBtn = document.getElementById('btn-wordcard-reset'); if (_resetBtn) _resetBtn.addEventListener('click', () => {
    wordDeck.reset();
    chatMessages = [];
    localStorage.removeItem(STORAGE_KEY);
    const msgArea = document.getElementById('wc-chat-messages');
    msgArea.innerHTML = '<div class="wc-system-msg">想对 TA 说什么？</div>';
    saveChat();
  });

  // ─── 保存聊天截图 ───
  function saveScreenshot() {
    if (chatMessages.length === 0) return;

    // 预加载所有表情包图片
    var stickerMsgs = chatMessages.filter(m => m.msgType === 'sticker');
    var stickerImages = {};
    var loadPromises = stickerMsgs.map(function(m) {
      return new Promise(function(resolve) {
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() { stickerImages[m.text] = img; resolve(); };
        img.onerror = function() { resolve(); };
        img.src = m.text;
      });
    });

    Promise.all(loadPromises).then(function() { _doScreenshot(stickerImages); });
  }

  function _doScreenshot(stickerImages) {

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const canvasW = 600;
    const dpr = 3;
    const padX = 50;
    const padY = 50;
    const gap = 16;
    const fontSize = 16;
    const lineH = 26;
    const bubblePadX = 16;
    const bubblePadY = 10;
    const maxTextW = canvasW - padX * 2 - bubblePadX * 2 - 40;

    // 预计算高度
    const tmpCanvas = document.createElement('canvas');
    const tmpCtx = tmpCanvas.getContext('2d');
    tmpCtx.font = `300 ${fontSize}px "Noto Serif SC", serif`;

    function wrapText(ctx, text, maxW) {
      const lines = [];
      let line = '';
      for (const ch of text) {
        if (ctx.measureText(line + ch).width > maxW) {
          lines.push(line);
          line = ch;
        } else {
          line += ch;
        }
      }
      if (line) lines.push(line);
      return lines.length || 1;
    }

    const stickerSize = 120;
    let totalH = padY;
    const msgLayouts = [];
    for (const msg of chatMessages) {
      if (msg.msgType === 'sticker') {
        const bubbleH = stickerSize + 8;
        msgLayouts.push({ ...msg, lineCount: 0, bubbleH, isSticker: true });
        totalH += bubbleH + gap;
      } else {
        const lineCount = wrapText(tmpCtx, msg.text, maxTextW);
        const bubbleH = bubblePadY * 2 + lineCount * lineH;
        msgLayouts.push({ ...msg, lineCount, bubbleH });
        totalH += bubbleH + gap;
      }
    }
    totalH += padY - gap;
    const canvasH = Math.max(totalH, 400);

    // 画布
    const canvas = document.createElement('canvas');
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    // 背景
    if (isDark) {
      ctx.fillStyle = '#050606';
    } else {
      ctx.fillStyle = '#e8ecf1';
    }
    ctx.fillRect(0, 0, canvasW, canvasH);

    // 标题
    ctx.font = `400 14px "LXGW WenKai", serif`;
    ctx.fillStyle = isDark ? 'rgba(200,198,198,0.3)' : 'rgba(100,110,130,0.3)';
    ctx.textAlign = 'center';
    ctx.fillText('字卡传讯', canvasW / 2, 30);
    ctx.textAlign = 'left';

    // 消息
    ctx.font = `300 ${fontSize}px "Noto Serif SC", serif`;
    let y = padY;
    for (const msg of msgLayouts) {
      const isUser = msg.type === 'user';
      const lines = [];
      let line = '';
      for (const ch of msg.text) {
        if (ctx.measureText(line + ch).width > maxTextW) {
          lines.push(line);
          line = ch;
        } else {
          line += ch;
        }
      }
      if (line) lines.push(line);

      const bubbleW = Math.min(
        Math.max(...lines.map(l => ctx.measureText(l).width)) + bubblePadX * 2,
        canvasW - padX * 2
      );
      const bubbleH = msg.bubbleH;
      const bubbleX = isUser ? canvasW - padX - bubbleW : padX;
      const r = 18;
      const sr = 4;

      // 表情包不画气泡
      if (msg.isSticker) {
        if (stickerImages[msg.text]) {
          var stkImg = stickerImages[msg.text];
          var drawW = stickerSize, drawH = stickerSize;
          if (stkImg.width > stkImg.height) { drawH = stickerSize * stkImg.height / stkImg.width; }
          else { drawW = stickerSize * stkImg.width / stkImg.height; }
          var stkX = isUser ? canvasW - padX - drawW : padX;
          try { ctx.drawImage(stkImg, stkX, y, drawW, drawH); } catch(e) {}
        }
        y += msg.bubbleH + gap;
        continue;
      }

      // 气泡背景
      ctx.beginPath();
      if (isUser) {
        ctx.moveTo(bubbleX + r, y);
        ctx.arcTo(bubbleX + bubbleW, y, bubbleX + bubbleW, y + bubbleH, r);
        ctx.arcTo(bubbleX + bubbleW, y + bubbleH, bubbleX, y + bubbleH, sr);
        ctx.arcTo(bubbleX, y + bubbleH, bubbleX, y, r);
        ctx.arcTo(bubbleX, y, bubbleX + bubbleW, y, r);
      } else {
        ctx.moveTo(bubbleX + r, y);
        ctx.arcTo(bubbleX + bubbleW, y, bubbleX + bubbleW, y + bubbleH, r);
        ctx.arcTo(bubbleX + bubbleW, y + bubbleH, bubbleX, y + bubbleH, r);
        ctx.arcTo(bubbleX, y + bubbleH, bubbleX, y, sr);
        ctx.arcTo(bubbleX, y, bubbleX + bubbleW, y, r);
      }
      ctx.closePath();

      if (isUser) {
        ctx.fillStyle = isDark ? 'rgba(4,52,90,0.35)' : 'rgba(140,160,200,0.1)';
        ctx.strokeStyle = isDark ? 'rgba(140,180,220,0.12)' : 'rgba(140,160,200,0.12)';
      } else {
        ctx.fillStyle = isDark ? 'rgba(4,52,90,0.2)' : 'rgba(255,255,255,0.45)';
        ctx.strokeStyle = isDark ? 'rgba(200,198,198,0.06)' : 'rgba(255,255,255,0.7)';
      }
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.stroke();

      // 内容：表情包画图片，普通消息画文字
      if (msg.isSticker && stickerImages[msg.text]) {
        var stkImg = stickerImages[msg.text];
        var drawW = stickerSize, drawH = stickerSize;
        if (stkImg.width > stkImg.height) { drawH = stickerSize * stkImg.height / stkImg.width; }
        else { drawW = stickerSize * stkImg.width / stkImg.height; }
        var stkX = isUser ? canvasW - padX - drawW - 4 : padX + 4;
        try { ctx.drawImage(stkImg, stkX, y + 4, drawW, drawH); } catch(e) {}
      } else {
        ctx.fillStyle = isDark ? 'rgba(200,198,198,0.9)' : 'rgba(60,70,90,0.9)';
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], bubbleX + bubblePadX, y + bubblePadY + fontSize + i * lineH);
        }
      }

      y += bubbleH + gap;
    }

    // 底部水印
    ctx.font = `300 11px "Noto Serif SC", serif`;
    ctx.fillStyle = isDark ? 'rgba(200,198,198,0.15)' : 'rgba(100,110,130,0.2)';
    ctx.textAlign = 'center';
    ctx.fillText('fizz letter', canvasW / 2, canvasH - 16);

    // 下载
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'wordcard-chat-' + Date.now() + '.png';
      link.href = url;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
    }, 'image/png');

    // 同时存信箱
    if (typeof Auth !== 'undefined' && Auth.isLoggedIn()) {
      const transcript = chatMessages.map(m => (m.type === 'user' ? '我：' : 'TA：') + m.text).join('\n');
      Auth.saveToMailbox('letter', transcript, { source: 'wordcard' });
    }
  }




  // ═══ 语音录制 ═══

  // ═══ 通话界面（v2 — 可缩小，通话中打字聊天）═══
  var inCall = false;
  window._wcInCall = false;
  var preCallCardMode = null;
  var callTimer = null;
  var callStartTime = 0;
  var callType = 'voice';
  var callBarEl = null;
  var callFullscreen = null;
  var pipStream = null;

  var callBtn = document.getElementById('btn-wc-call');
  if (callBtn) callBtn.addEventListener('click', showCallChoose);

  function showCallChoose() {
    if (inCall) { showCallFullscreen(); return; }
    var ov = document.createElement('div');
    ov.className = 'wc-call-choose';
    ov.innerHTML = '<div class="wc-call-choose-box">' +
      '<div class="wc-call-choose-title">选择通话方式</div>' +
      '<div class="wc-call-choose-btns">' +
        '<div class="wc-call-choose-item" data-type="voice">' +
          '<div class="icon"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 4.12 4.18 2 2 0 0 1 6.1 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.7 2.35a2 2 0 0 1-.45 2.11L10.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.75.34 1.54.57 2.35.7A2 2 0 0 1 22 16.92z"/></svg></div>' +
          '<span class="label">语音通话</span>' +
        '</div>' +
        '<div class="wc-call-choose-item" data-type="video">' +
          '<div class="icon"><svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7" fill="none"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2" fill="none"/></svg></div>' +
          '<span class="label">视频通话</span>' +
        '</div>' +
      '</div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function(e) {
      var item = e.target.closest('.wc-call-choose-item');
      if (item) { ov.remove(); startCall(item.dataset.type); }
      else if (e.target === ov) { ov.remove(); }
    });
  }

  function getAuthToken() {
    try {
      var m = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
      return m ? m[1] : '';
    } catch(e) { return ''; }
  }

    function getCallAvatar() {
    return getAvatarSrc('ta') || '';
  }
  function getCallName() { return getTaNickname() || 'TA'; }

  // 来电开场白：接听后 AI 在通话界面说第一句话
  async function fetchCallOpener(chatId) {
    try {
      var res = await fetch('/api/incoming-call/opener', {
        method: 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
        body: JSON.stringify({ chatId: chatId })
      });
      var data = await res.json();
      if (data.opener) {
        console.log('[incoming] opener received:', data.opener);
        // 直接往通话回复区 DOM 插入
        function insertToCallUI(text) {
          var box = document.querySelector('.wc-call-reply-box');
          if (box) {
            var item = document.createElement('div');
            item.className = 'wc-call-reply-item';
            item.textContent = text;
            box.appendChild(item);
            box.classList.add('has-content');
            box.scrollTop = box.scrollHeight;
            console.log('[incoming] opener displayed in call UI');
            return true;
          }
          return false;
        }
        // 尝试插入，如果通话界面还没出来就轮询
        if (!insertToCallUI(data.opener)) {
          var retries = 0;
          var wait = setInterval(function() {
            retries++;
            if (insertToCallUI(data.opener)) {
              clearInterval(wait);
            } else if (retries > 20) {
              clearInterval(wait);
              console.log('[incoming] call UI not found after retries, skip');
            }
          }, 300);
        }
        // 保存到聊天记录
        chatMessages.push({ text: data.opener, type: 'reply' });
        saveChat();
      }
    } catch(e) {
      console.log('fetchCallOpener error:', e);
    }
  }

    // 全局来电接听处理（从 app.js 调用）
  window.handleIncomingCallAccept = async function(chatId, callType) {
    console.log('[incoming] handleIncomingCallAccept called:', chatId, callType);
    try {
      if (chatId) {
        await openChat(chatId);
        console.log('[incoming] openChat done');
      }
      // 等待 DOM 完全渲染
      await new Promise(function(r) { setTimeout(r, 800); });
      startCall(callType || 'voice');
      console.log('[incoming] startCall done');
      // 再等一下确保通话 UI 显示
      setTimeout(function() {
        fetchCallOpener(chatId);
        console.log('[incoming] fetchCallOpener called');
      }, 500);
    } catch(e) {
      console.error('[incoming] error:', e);
    }
  };

  // 检查 sessionStorage 是否有待处理的来电（从其他页面接听跳转过来）
  // 需要延迟检查，因为脚本加载时字卡系统可能还没初始化完
  setTimeout(function checkPendingCall() {
    var pending = sessionStorage.getItem('incoming_call');
    if (pending) {
      sessionStorage.removeItem('incoming_call');
      console.log('[incoming] found pending call in sessionStorage:', pending);
      try {
        var d = JSON.parse(pending);
        window.handleIncomingCallAccept(d.chatId, d.callType);
      } catch(e) { console.error('[incoming] pending call error:', e); }
    }
  }, 1500);

  function startCall(type) {
    callType = type;
    inCall = true; window._wcInCall = true;
    callStartTime = 0;
    // 自动切换到语音卡组
    preCallCardMode = wordDeck.cardMode;
    wordDeck.setCardMode('default');
    updateModeTabs('voice');
    showCallFullscreen();
  }

  function showCallFullscreen() {
    if (callFullscreen) return;
    callFullscreen = document.createElement('div');
    callFullscreen.className = 'wc-call-fullscreen ' + callType + '-call';
    var avatarSrc = getCallAvatar();
    var name = getCallName();
    var avatarHtml = avatarSrc ? '<img src="' + avatarSrc + '">' : name.charAt(0);
    var isConnected = callStartTime > 0;
    var statusText = isConnected ? '通话中' : '正在连接...';
    var statusClass = isConnected ? '' : ' connecting';

    if (callType === 'video') {
      callFullscreen.innerHTML =
        (function(){ var illustSrc = ''; try { var di = typeof getActivePersonaInfo === 'function' ? getActivePersonaInfo('dream') : null; if (di && di.illust_url) illustSrc = di.illust_url; } catch(e){} var bgSrc = illustSrc || avatarSrc; return bgSrc ? '<div class="wc-call-video-main"><img src="' + bgSrc + '"></div>' : '<div class="wc-call-video-main" style="background:#1a1a2e"></div>'; })() +
        (function(){ var mySrc = getAvatarSrc("me"); return mySrc ? '<div class="wc-call-video-pip"><img src="' + mySrc + '" style="width:100%;height:100%;object-fit:cover"></div>' : '<div class="wc-call-video-pip"><div class="pip-placeholder">' + getMyNickname().charAt(0) + '</div></div>'; })() +
        '<div class="wc-call-top">' +
          '<div class="wc-call-name">' + name + '</div>' +
          '<div class="wc-call-status' + statusClass + '">' + statusText + '</div>' +
          '<div class="wc-call-fs-timer">' + (isConnected ? getCallTimeStr() : '') + '</div>' +
        '</div>' +
        '<div class="wc-call-bottom">' +
          '<div class="wc-call-btns">' +
            '<button class="wc-call-btn mute" title="静音"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="9" y="1" width="6" height="11" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/></svg></button>' +
            '<button class="wc-call-btn hangup" title="挂断"><svg viewBox="0 0 24 24" fill="#fff"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.18-.29-.44-.29-.72 0-.28.11-.54.29-.72C3.69 8.48 7.66 7 12 7s8.31 1.47 11.71 4.72c.18.18.29.44.29.72 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85a1 1 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg></button>' +
            '<button class="wc-call-btn speaker" title="免提"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>' +
          '</div>' +
          '<button class="wc-call-minimize">缩小窗口</button>' +
        '</div>';
      // 不开真实摄像头
    } else {
      var bgHtml = avatarSrc ? '<div class="wc-call-bg" style="background-image:url(' + avatarSrc + ')"></div>' : '';
      callFullscreen.innerHTML = bgHtml +
        '<div class="wc-call-top">' +
          '<div class="wc-call-avatar">' + avatarHtml + '</div>' +
          '<div class="wc-call-name">' + name + '</div>' +
          '<div class="wc-call-status' + statusClass + '">' + statusText + '</div>' +
          '<div class="wc-call-fs-timer">' + (isConnected ? getCallTimeStr() : '') + '</div>' +
        '</div>' +
        '<div class="wc-call-bottom">' +
          '<div class="wc-call-btns">' +
            '<button class="wc-call-btn mute" title="静音"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="9" y="1" width="6" height="11" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/></svg></button>' +
            '<button class="wc-call-btn hangup" title="挂断"><svg viewBox="0 0 24 24" fill="#fff"><path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.18-.29-.44-.29-.72 0-.28.11-.54.29-.72C3.69 8.48 7.66 7 12 7s8.31 1.47 11.71 4.72c.18.18.29.44.29.72 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85a1 1 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/></svg></button>' +
            '<button class="wc-call-btn speaker" title="免提"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button>' +
          '</div>' +
          '<button class="wc-call-minimize">缩小窗口</button>' +
        '</div>';
    }

    document.body.appendChild(callFullscreen);

    // 通话 AI 回复区（多条滚动，保留最近4条）
    var callReplyBox = document.createElement('div');
    callReplyBox.className = 'wc-call-reply-box';
    var topArea = callFullscreen.querySelector('.wc-call-top');
    if (topArea && topArea.nextSibling) {
      callFullscreen.insertBefore(callReplyBox, topArea.nextSibling);
    } else {
      callFullscreen.insertBefore(callReplyBox, callFullscreen.querySelector('.wc-call-bottom'));
    }

    // 通话独立对话历史
    if (!window._callHistory) window._callHistory = [];

    function addCallReply(text) {
      // 移除 typing 指示器
      var typ = callReplyBox.querySelector('.typing');
      if (typ) typ.remove();
      // 添加新回复
      var item = document.createElement('div');
      item.className = 'wc-call-reply-item';
      item.textContent = text;
      callReplyBox.appendChild(item);
      callReplyBox.classList.add('has-content');
      // 只保留最近4条
      while (callReplyBox.children.length > 4) {
        callReplyBox.removeChild(callReplyBox.firstChild);
      }
      callReplyBox.scrollTop = callReplyBox.scrollHeight;
    }

    function showCallTyping() {
      var typ = callReplyBox.querySelector('.typing');
      if (typ) return;
      var item = document.createElement('div');
      item.className = 'wc-call-reply-item typing';
      item.textContent = '......';
      callReplyBox.appendChild(item);
      callReplyBox.classList.add('has-content');
      callReplyBox.scrollTop = callReplyBox.scrollHeight;
    }

    // 暴露给 fetchCallOpener 用
    window._addCallReply = addCallReply;

    // 麦克风按钮点击 → 弹出居中对话框
    var muteBtn = callFullscreen.querySelector('.mute');
    var callDialog = null;
    if (muteBtn) {
      muteBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        muteBtn.classList.remove('active');
        if (callDialog) { callDialog.remove(); callDialog = null; return; }
        callDialog = document.createElement('div');
        callDialog.className = 'wc-call-input-dialog';
        callDialog.innerHTML = '<div class="dialog-title">你说</div><div class="dialog-body"><input type="text" placeholder="请输入你想说的话..." id="wc-call-type-input" autocomplete="off"></div><div class="dialog-btns"><button id="wc-call-cancel">取消</button><button id="wc-call-confirm">确定</button></div>';
        callFullscreen.appendChild(callDialog);
        var ci = document.getElementById('wc-call-type-input');
        ci.focus();
        function closeDialog() { if (callDialog) { callDialog.remove(); callDialog = null; } }
        document.getElementById('wc-call-cancel').addEventListener('click', closeDialog);
        document.getElementById('wc-call-confirm').addEventListener('click', function() {
          var txt = ci.value.trim();
          if (!txt) return;
          closeDialog();
          callSendText(txt, addCallReply, showCallTyping);
        });
        ci.addEventListener('keydown', function(e) { if (e.key === 'Enter' && !e.isComposing) document.getElementById('wc-call-confirm').click(); });
      });
    }

    callFullscreen.querySelector('.hangup').addEventListener('click', endCall);
    callFullscreen.querySelector('.wc-call-minimize').addEventListener('click', minimizeCall);
    callFullscreen.querySelectorAll('.speaker').forEach(function(b) {
      b.addEventListener('click', function() { this.classList.toggle('active'); });
    });

    if (!callStartTime) {
      setTimeout(function() {
        if (!callFullscreen || callStartTime) return;
        callStartTime = Date.now();
        var st = callFullscreen.querySelector('.wc-call-status');
        if (st) { st.textContent = '通话中'; st.classList.remove('connecting'); }
        startCallTimer();
      }, 2000 + Math.random() * 1000);
    } else {
      startCallTimer();
    }
  }

  function getCallTimeStr() {
    if (!callStartTime) return '00:00';
    var sec = Math.floor((Date.now() - callStartTime) / 1000);
    var mm = Math.floor(sec / 60);
    var ss = sec % 60;
    return (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
  }

  function startCallTimer() {
    if (callTimer) clearInterval(callTimer);
    callTimer = setInterval(function() {
      if (!inCall) { clearInterval(callTimer); return; }
      var ts = getCallTimeStr();
      if (callFullscreen) { var t = callFullscreen.querySelector('.wc-call-fs-timer'); if (t) t.textContent = ts; }
      if (callBarEl) { var t = callBarEl.querySelector('.cf-timer'); if (t) t.textContent = ts; }
    }, 1000);
  }

  function minimizeCall() {
    if (pipStream) { pipStream.getTracks().forEach(function(t) { t.stop(); }); pipStream = null; }
    if (callFullscreen) { callFullscreen.remove(); callFullscreen = null; }
    showCallBar();
  }

  function showCallBar() {
    if (callBarEl) return;
    callBarEl = document.createElement('div');
    callBarEl.className = 'wc-call-float ' + callType;

    if (callType === 'video') {
      // 视频浮窗：显示对方头像/立绘
      var bgSrc = '';
      try { var di = typeof getActivePersonaInfo === 'function' ? getActivePersonaInfo('dream') : null; if (di && di.illust_url) bgSrc = di.illust_url; } catch(e) {}
      if (!bgSrc) bgSrc = getCallAvatar() || '';
      var name = getCallName();
      callBarEl.innerHTML = (bgSrc ? '<img class="cf-video-bg" src="' + bgSrc + '">' : '<div class="cf-video-bg" style="background:#1a1a2e"></div>') +
        '<div class="cf-video-overlay"><div class="cf-name">' + name + '</div><div class="cf-timer">' + getCallTimeStr() + '</div></div>';
    } else {
      // 语音胶囊：绿色图标+时间
      callBarEl.innerHTML = '<span class="cf-icon"><svg viewBox="0 0 24 24" fill="#fff"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg></span>' +
        '<span class="cf-timer">' + getCallTimeStr() + '</span>';
    }

    document.body.appendChild(callBarEl);

    // 点击展开
    callBarEl.addEventListener('click', function(e) {
      if (callBarEl._dragged) { callBarEl._dragged = false; return; }
      removeCallBar(); showCallFullscreen();
    });

    // 拖动支持
    var startX, startY, origX, origY, moved;
    function onStart(e) {
      var t = e.touches ? e.touches[0] : e;
      startX = t.clientX; startY = t.clientY;
      var r = callBarEl.getBoundingClientRect();
      origX = r.left; origY = r.top;
      moved = false;
      callBarEl.classList.add('dragging');
      document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchmove', onMove, { passive: false }); document.addEventListener('touchend', onEnd);
    }
    function onMove(e) {
      e.preventDefault();
      var t = e.touches ? e.touches[0] : e;
      var dx = t.clientX - startX, dy = t.clientY - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      if (!moved) return;
      var nx = origX + dx, ny = origY + dy;
      // 边界限制
      var w = callBarEl.offsetWidth, h = callBarEl.offsetHeight;
      nx = Math.max(0, Math.min(window.innerWidth - w, nx));
      ny = Math.max(0, Math.min(window.innerHeight - h, ny));
      callBarEl.style.left = nx + 'px';
      callBarEl.style.top = ny + 'px';
      callBarEl.style.right = 'auto';
    }
    function onEnd() {
      callBarEl.classList.remove('dragging');
      if (moved) callBarEl._dragged = true;
      document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onEnd);
      // 贴边（吸附到最近的左/右边）
      if (moved && callBarEl) {
        var r = callBarEl.getBoundingClientRect();
        var center = r.left + r.width / 2;
        if (center < window.innerWidth / 2) {
          callBarEl.style.left = '12px'; callBarEl.style.right = 'auto';
        } else {
          callBarEl.style.left = 'auto'; callBarEl.style.right = '12px';
        }
      }
    }
    callBarEl.addEventListener('mousedown', onStart);
    callBarEl.addEventListener('touchstart', onStart, { passive: true });
  }

  // _watchCallReply removed — 通话用独立API

    function removeCallBar() { if (callBarEl) { callBarEl.remove(); callBarEl = null; } }

  function endCall() {
    if (callTimer) { clearInterval(callTimer); callTimer = null; }
    if (pipStream) { pipStream.getTracks().forEach(function(t) { t.stop(); }); pipStream = null; }
    var dur = callStartTime ? Math.floor((Date.now() - callStartTime) / 1000) : 0;
    inCall = false; window._wcInCall = false; callStartTime = 0;
    // 恢复通话前的卡组模式
    if (preCallCardMode) {
      wordDeck.setCardMode(preCallCardMode);
      updateModeTabs(preCallCardMode);
      preCallCardMode = null;
    }
    if (callFullscreen) { callFullscreen.remove(); callFullscreen = null; }
    removeCallBar();
    var mm = Math.floor(dur / 60); var ss = dur % 60;
    var ts = (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
    var label = callType === 'video' ? '视频通话' : '语音通话';
    var sm = document.createElement('div');
    sm.className = 'wc-call-sys-msg';
    sm.textContent = dur > 0 ? label + ' ' + ts : label + ' 未接通';
    var ma = document.getElementById('wc-chat-messages');
    if (ma) { ma.appendChild(sm); scrollToBottom(); }
  }

  function tryStartCamera() {
    if (!callFullscreen) return;
    var pip = callFullscreen.querySelector('.wc-call-video-pip');
    if (!pip || typeof navigator.mediaDevices === 'undefined') return;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then(function(stream) {
        pipStream = stream; pip.innerHTML = '';
        var v = document.createElement('video');
        v.srcObject = stream; v.autoplay = true; v.playsInline = true; v.muted = true;
        v.style.transform = 'scaleX(-1)'; pip.appendChild(v);
      }).catch(function() {});
  }

  
    var micBtn = document.getElementById('btn-wc-mic');
  var holdBtn = null;
  var isVoiceMode = false;
  var mediaRecorder = null;
  var recordChunks = [];
  var recordStart = 0;
  var recordTimer = null;
  var recordOverlay = null;
  var isCancelling = false;

  if (micBtn) {
    // 点击切换语音/文字模式
    micBtn.addEventListener('click', function() {
      isVoiceMode = !isVoiceMode;
      var area = document.querySelector('.wc-chat-input-area');
      if (isVoiceMode) {
        micBtn.classList.add('active');
        area.classList.add('wc-input-voice-mode');
        if (!holdBtn) {
          holdBtn = document.createElement('button');
          holdBtn.className = 'wc-hold-btn';
          holdBtn.textContent = '按住 说话';
          document.getElementById('wc-input').after(holdBtn);
          setupHoldBtn(holdBtn);
        }
      } else {
        micBtn.classList.remove('active');
        area.classList.remove('wc-input-voice-mode');
        document.getElementById('wc-input').focus();
      }
    });
  }

  function setupHoldBtn(btn) {
    var startY = 0;
    function onStart(e) {
      e.preventDefault();
      startY = e.touches ? e.touches[0].clientY : e.clientY;
      isCancelling = false;
      startRecording();
    }
    function onMove(e) {
      if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
      var y = e.touches ? e.touches[0].clientY : e.clientY;
      if (startY - y > 60) {
        isCancelling = true;
        if (recordOverlay) recordOverlay.querySelector('.wc-record-box').classList.add('cancelling');
      } else {
        isCancelling = false;
        if (recordOverlay) recordOverlay.querySelector('.wc-record-box').classList.remove('cancelling');
      }
    }
    function onEnd(e) {
      e.preventDefault();
      stopRecording(!isCancelling);
    }
    btn.addEventListener('touchstart', onStart, { passive: false });
    btn.addEventListener('touchmove', onMove, { passive: false });
    btn.addEventListener('touchend', onEnd);
    btn.addEventListener('mousedown', onStart);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', function(e) {
      if (mediaRecorder && mediaRecorder.state === 'recording') onEnd(e);
    });
  }

  var recognizedText = '';
  var recognition = null;

  async function startRecording() {
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      recordChunks = [];
      recognizedText = '';
      mediaRecorder.ondataavailable = function(e) { if (e.data.size > 0) recordChunks.push(e.data); };
      mediaRecorder.start();
      recordStart = Date.now();
      showRecordOverlay();
      // 语音识别
      var SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        recognition = new SpeechRec();
        recognition.lang = 'zh-CN';
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = function(e) {
          var t = '';
          for (var i = 0; i < e.results.length; i++) {
            t += e.results[i][0].transcript;
          }
          recognizedText = t;
          if (recordOverlay) {
            var hint = recordOverlay.querySelector('.wc-record-hint');
            if (hint) hint.textContent = t || '松手发送';
          }
        };
        recognition.onerror = function() {};
        recognition.start();
      }
      // 60秒自动停止
      recordTimer = setTimeout(function() { stopRecording(true); }, 60000);
    } catch(e) {
      console.log('mic permission denied:', e);
      alert('需要麦克风权限才能录音');
    }
  }

  function stopRecording(shouldSend) {
    if (recordTimer) { clearTimeout(recordTimer); recordTimer = null; }
    if (recognition) { try { recognition.stop(); } catch(e) {} recognition = null; }
    hideRecordOverlay();
    if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
    var finalText = recognizedText.trim();
    mediaRecorder.onstop = async function() {
      mediaRecorder.stream.getTracks().forEach(function(t) { t.stop(); });
      if (!shouldSend || recordChunks.length === 0) return;
      var duration = Math.round((Date.now() - recordStart) / 1000);
      if (duration < 1) return;
      var blob = new Blob(recordChunks, { type: 'audio/webm' });
      var voiceUrl = null;
      try {
        var resp = await fetch('/api/wc-audio/upload', { method: 'POST', body: blob });
        var data = await resp.json();
        if (data.url) voiceUrl = data.url;
      } catch(e) { console.log('upload failed:', e); }
      // 显示语音气泡（带转写文字）
      var displayText = finalText || '';
      addMsg(displayText, 'user', 'voice', null, { voiceUrl: voiceUrl, duration: duration });
      // 用转写文字触发 AI 回复
      if (finalText) {
        sendText(finalText);
      }
    };
    mediaRecorder.stop();
  }

  function showRecordOverlay() {
    recordOverlay = document.createElement('div');
    recordOverlay.className = 'wc-record-overlay';
    recordOverlay.innerHTML = '<div class="wc-record-box"><div class="wc-record-indicator"><svg viewBox="0 0 24 24"><rect x="9" y="1" width="6" height="11" rx="3"/><path d="M19 10v1a7 7 0 0 1-14 0v-1"/></svg></div><div class="wc-record-time">0:00</div><div class="wc-record-hint">松手发送</div><div class="wc-record-cancel">↑ 上滑取消</div></div>';
    document.body.appendChild(recordOverlay);
    var timeEl = recordOverlay.querySelector('.wc-record-time');
    var si = setInterval(function() {
      if (!recordOverlay) { clearInterval(si); return; }
      var sec = Math.round((Date.now() - recordStart) / 1000);
      var m = Math.floor(sec / 60);
      var s = sec % 60;
      timeEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    }, 500);
    recordOverlay._interval = si;
  }

  function hideRecordOverlay() {
    if (recordOverlay) {
      if (recordOverlay._interval) clearInterval(recordOverlay._interval);
      recordOverlay.remove();
      recordOverlay = null;
    }
  }

    document.getElementById('btn-wc-send').addEventListener('click', send);
  document.getElementById('wc-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) send();
  });

  let quoteQueue = [];

  function send() {
    if (busy) return;
    var input = document.getElementById('wc-input');
    var text = input.value.trim();

    if (text) {
      messageQueue.push(text);
      const q = pendingQuote ? { ...pendingQuote } : null;
      quoteQueue.push(q);
      input.value = '';
      addMsg(text, 'user', undefined, q);
      clearQuote();
      input.focus();
      return;
    }

    if (messageQueue.length === 0) return;
    var combined = messageQueue.join('\n');
    messageQueue = [];
    quoteQueue = [];
    sendText(combined);
  }

  // 通话模式：从语音卡池抽候选 → filter → 显示在通话界面
  async function callSendText(text, addReplyFn, showTypingFn) {
    showTypingFn();

    // 从语音卡池抽候选
    var allVoiceCards = [];
    if (voiceCardData && voiceCardData.groups) {
      voiceCardData.groups.forEach(function(g) {
        if (g.enabled === false) return;
        g.cards.forEach(function(c) { allVoiceCards.push(c.text); });
      });
    }

    // 混合模式：从文字卡池也抽一些
    var textPoolCards = [];
    if (vcMixTextCards && wordPoolData && wordPoolData.groups) {
      wordPoolData.groups.forEach(function(g) {
        if (g.enabled === false) return;
        g.cards.forEach(function(c) { textPoolCards.push(c.text); });
      });
    }

    if (allVoiceCards.length === 0 && textPoolCards.length === 0) {
      setTimeout(function() { addReplyFn('……'); }, 2000);
      return;
    }

    // 抽候选：语音卡优先（5张）+ 文字卡补充（3张）
    var shuffledVoice = allVoiceCards.sort(function() { return Math.random() - 0.5; });
    var candidates = shuffledVoice.slice(0, vcMixTextCards ? 5 : 8).map(function(t) { return { text: t, source: 'voice' }; });
    if (vcMixTextCards && textPoolCards.length > 0) {
      var shuffledText = textPoolCards.sort(function() { return Math.random() - 0.5; });
      var textCount = Math.min(3, shuffledText.length);
      for (var ti = 0; ti < textCount; ti++) {
        candidates.push({ text: shuffledText[ti], source: 'text-pool' });
      }
    }

    var finalCards;
    try {
      var resp = await fetch('/api/word-cards/filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ question: text, candidates: candidates, history: chatMessages.slice(-10), ...getPersonaIds() })
      });
      var data = await resp.json();
      if (data.none) {
        // AI 觉得都不搭，再抽一批
        var shuffled2 = allVoiceCards.sort(function() { return Math.random() - 0.5; });
        finalCards = [shuffled2[0]];
      } else if (data.cards && data.cards.length > 0) {
        finalCards = data.cards;
      } else {
        finalCards = [candidates[0].text];
      }
    } catch (err) {
      finalCards = [candidates[0].text];
    }

    // 通话只取一张卡，像真人说话一句一句来
    var callReplyText = finalCards[0] || '……';
    var callDelay = 3000 + Math.random() * 3000;
    setTimeout(function() {
      addReplyFn(callReplyText);
    }, callDelay);
  }

    async function sendText(text) {
    if (busy) return;
    busy = true;

    const typing = document.getElementById('wc-typing');
    typing.style.display = 'flex';
    scrollToBottom();

    const localResult = wordDeck.drawCandidates(text, 6);
    const keywordHint = localResult.keywordIds;

    let result;
    try {
      const poolResp = await fetch('/api/word-cards/select-pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, history: chatMessages.slice(-10), keywordHint , ...getPersonaIds()})
      });
      const poolData = await poolResp.json();
      if (poolData.none) {
        result = { candidates: [], question: text, keywordIds: keywordHint, forceFreeze: true };
      } else if (poolData.pools && poolData.pools.length > 0) {
        result = wordDeck.drawFromPoolNames(poolData.pools, 8);
        result.question = text;
        result.keywordIds = keywordHint;
      } else {
        result = localResult;
      }
    } catch (e) {
      console.log('select-pools fallback:', e.message);
      result = localResult;
    }

    if (result.candidates.length === 0 && !result.forceFreeze) {
      wordDeck.usedTexts.clear();
      result = localResult.candidates.length > 0 ? localResult : wordDeck.drawCandidates(text, 6);
    }

    const candidateObjs = result.candidates.map(c => ({ text: c.text, source: c.source }));
    let finalCards;
    let aiQuote = null;

    if (candidateObjs.length === 0 && !result.forceFreeze) {
      typing.style.display = 'none';
      addMsg('\u2026', 'reply', 'voice');
      busy = false;
      return;
    }

    try {
      const resp = await fetch('/api/word-cards/filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, candidates: candidateObjs, history: chatMessages.slice(-10) , ...getPersonaIds()})
      });
      const data = await resp.json();
      if (data.freeType && data.cards && data.cards.length > 0) {
        // 自由组字模式：单字逐个弹出，初始10秒，之后每秒一个字
        // 先处理引用
        if (data.quoteIndex != null) {
          const recentMsgs = chatMessages.slice(-10);
          const qi = data.quoteIndex;
          if (qi >= 0 && qi < recentMsgs.length) {
            const qm = recentMsgs[qi];
            aiQuote = { text: qm.text, type: qm.type };
            if (qm.msgType) aiQuote.msgType = qm.msgType;
          }
        }
        typing.style.display = 'none';
        let freeDelay = 10000;
        const freeChars = data.cards;
        freeChars.forEach((ch, i) => {
          setTimeout(() => {
            addMsg(ch, 'reply', undefined, i === 0 ? aiQuote : null);
            if (i === freeChars.length - 1) {
              maybeAiSticker(freeDelay);
              busy = false;
              document.getElementById('wc-input').focus();
            }
          }, freeDelay);
          freeDelay += 1000;
        });
        return;
      }
      if (data.none) {
        const meta = typeof CARD_LIMIT_META !== 'undefined' ? CARD_LIMIT_META : ["字卡里没有我想说的"];
        finalCards = [meta[Math.floor(Math.random() * meta.length)]];
      } else if (data.cards && data.cards.length > 0) {
        finalCards = data.cards;
      } else {
        finalCards = candidateObjs.map(c => c.text).slice(0, 2);
      }
      if (data.quoteIndex != null) {
        const recentMsgs = chatMessages.slice(-10);
        const qi = data.quoteIndex;
        if (qi >= 0 && qi < recentMsgs.length) {
          const qm = recentMsgs[qi];
          aiQuote = { text: qm.text, type: qm.type };
          if (qm.msgType) aiQuote.msgType = qm.msgType;
        }
      }
    } catch (err) {
      finalCards = candidateObjs.map(c => c.text).slice(0, 2);
    }

    const singleKws = new Set(['where', 'weather', 'home', 'outside', 'rain', 'night']);
    if (finalCards.length > 1 && result.keywordIds.some(k => singleKws.has(k))) {
      finalCards = [finalCards[0]];
    }

    wordDeck.commitCards(text, result.keywordIds, finalCards);

    let delay = 10000 + Math.random() * 15000;
    finalCards.forEach((cardText, i) => {
      setTimeout(() => {
        if (i === finalCards.length - 1) typing.style.display = 'none';
        addMsg(cardText, 'reply', Math.random() < 0.3 ? 'voice' : undefined, i === 0 ? aiQuote : null);
        if (i === finalCards.length - 1) {
          maybeAiSticker(delay);
          busy = false;
          document.getElementById('wc-input').focus();
        }
      }, delay);
      delay += 8000 + Math.random() * 7000;
    });
  }

  // AI 随机发表情包（30% 概率，延迟 2-5 秒）
  function maybeAiSticker(baseDelay) {
    const enabledStickers = stickerGroups
      .filter(g => g.enabled)
      .flatMap(g => g.stickers);
    if (enabledStickers.length === 0) return;
    if (Math.random() > 0.12) return;
    const sticker = enabledStickers[Math.floor(Math.random() * enabledStickers.length)];
    setTimeout(() => {
      addMsg(stickerUrl(sticker), 'reply', 'sticker');
    }, 2000 + Math.random() * 3000);
  }

  function appendMsgDom(text, type, container, msgType, quote, extra) {
    const row = document.createElement('div');
    row.className = 'wc-msg-row' + (type === 'user' ? ' is-user' : '');
    if (extra) row._voiceExtra = extra;
    const avatar = document.createElement('div');
    avatar.className = 'wc-msg-avatar';
    avatar.innerHTML = buildMsgAvatarHtml(type);
    const bubble = document.createElement('div');
    bubble.className = type === 'user' ? 'wc-msg-user' : 'wc-msg-reply';
    if (quote && quote.text) {
      const qBar = document.createElement('div');
      qBar.className = 'wc-quote-bar';
      const qName = document.createElement('span');
      qName.className = 'wc-quote-name';
      qName.textContent = quote.type === 'user' ? getMyNickname() : (getTaNickname() || 'TA');
      const qText = document.createElement('span');
      qText.className = 'wc-quote-text';
      qText.textContent = quote.msgType === 'sticker' ? '[表情包]' : quote.text;
      qBar.appendChild(qName);
      qBar.appendChild(qText);
      bubble.appendChild(qBar);
    }
    if (msgType === 'voice') {
      // 语音消息：气泡 + 文字转写
      const wrapper = document.createElement('div');
      wrapper.className = 'wc-voice-wrapper';
      const vBubble = document.createElement('div');
      vBubble.className = 'wc-voice-bubble';
      var voiceUrl = null;
      var duration = 0;
      // voiceUrl 和 duration 存在 quote 旁边的额外字段里，通过 dataset 传
      // 从 text 解析: text 是显示文字，voiceUrl/duration 通过第6个参数 extra 传入
      // 但现有函数签名不好改，用 data attribute 的方式：从 addMsg 传 extra
      if (row._voiceExtra) {
        voiceUrl = row._voiceExtra.voiceUrl || null;
        duration = row._voiceExtra.duration || 0;
      }
      if (!duration && text) duration = Math.max(2, Math.ceil(text.length / 4));
      const waves = document.createElement('div');
      waves.className = 'wc-voice-waves';
      for (var wi = 0; wi < 3; wi++) {
        var bar = document.createElement('div');
        bar.className = 'wc-voice-wave';
        waves.appendChild(bar);
      }
      const dur = document.createElement('span');
      dur.className = 'wc-voice-duration';
      dur.textContent = duration + "''";
      vBubble.appendChild(waves);
      vBubble.appendChild(dur);
      // 播放逻辑
      vBubble.addEventListener('click', function() {
        if (voiceUrl) {
          if (vBubble._audio && !vBubble._audio.paused) {
            vBubble._audio.pause();
            vBubble._audio.currentTime = 0;
            vBubble.classList.remove('playing');
            return;
          }
          // 停止其他正在播放的语音
          document.querySelectorAll('.wc-voice-bubble.playing').forEach(function(b) {
            if (b._audio) { b._audio.pause(); b._audio.currentTime = 0; }
            b.classList.remove('playing');
          });
          var audio = new Audio(voiceUrl);
          vBubble._audio = audio;
          vBubble.classList.add('playing');
          audio.play().catch(function() { vBubble.classList.remove('playing'); });
          audio.addEventListener('ended', function() { vBubble.classList.remove('playing'); });
        } else {
          // 没有音频，播放动画模拟（按时长）
          if (vBubble.classList.contains('playing')) return;
          document.querySelectorAll('.wc-voice-bubble.playing').forEach(function(b) {
            if (b._timer) clearTimeout(b._timer);
            b.classList.remove('playing');
          });
          vBubble.classList.add('playing');
          vBubble._timer = setTimeout(function() { vBubble.classList.remove('playing'); }, duration * 1000);
        }
      });
      wrapper.appendChild(vBubble);
      // 文字转写（始终显示）
      if (text) {
        const vText = document.createElement('div');
        vText.className = 'wc-voice-text';
        vText.textContent = text;
        wrapper.appendChild(vText);
      }
      bubble.appendChild(wrapper);
    } else if (msgType === 'sticker') {
      bubble.classList.add('wc-msg-sticker');
      const img = document.createElement('img');
      img.src = text;
      img.alt = '';
      img.className = 'wc-sticker-msg-img';
      bubble.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.textContent = text;
      bubble.appendChild(span);
    }
    row.appendChild(avatar);
    row.appendChild(bubble);
    container.appendChild(row);
    return row;
  }

  function addMsg(text, type, msgType, quote, extra) {
    const msgArea = document.getElementById('wc-chat-messages');
    appendMsgDom(text, type, msgArea, msgType, quote, extra);
    const msgObj = { text, type };
    if (msgType) msgObj.msgType = msgType;
    if (quote) msgObj.quote = quote;
    if (extra && extra.voiceUrl) msgObj.voiceUrl = extra.voiceUrl;
    if (extra && extra.duration) msgObj.duration = extra.duration;
    chatMessages.push(msgObj);
    scrollToBottom();
    saveChat();
  }

  function scrollToBottom() {
    const msgArea = document.getElementById('wc-chat-messages');
    requestAnimationFrame(() => { msgArea.scrollTop = msgArea.scrollHeight; });
  }

  // ═══ 消息引用（长按菜单 + 预览条） ═══
  let pendingQuote = null;

  function setQuote(msgObj) {
    pendingQuote = { text: msgObj.text, type: msgObj.type };
    if (msgObj.msgType) pendingQuote.msgType = msgObj.msgType;
    showQuotePreview();
    document.getElementById('wc-input').focus();
  }

  function clearQuote() {
    pendingQuote = null;
    const el = document.getElementById('wc-quote-preview');
    if (el) el.remove();
  }

  function showQuotePreview() {
    let el = document.getElementById('wc-quote-preview');
    if (el) el.remove();
    el = document.createElement('div');
    el.className = 'wc-quote-preview';
    el.id = 'wc-quote-preview';
    const line = document.createElement('div');
    line.className = 'wc-qp-line';
    const body = document.createElement('div');
    body.className = 'wc-qp-body';
    const name = document.createElement('div');
    name.className = 'wc-qp-name';
    name.textContent = pendingQuote.type === 'user' ? getMyNickname() : (getTaNickname() || 'TA');
    const txt = document.createElement('div');
    txt.className = 'wc-qp-text';
    txt.textContent = pendingQuote.msgType === 'sticker' ? '[表情包]' : pendingQuote.text;
    body.appendChild(name);
    body.appendChild(txt);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'wc-qp-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', clearQuote);
    el.appendChild(line);
    el.appendChild(body);
    el.appendChild(closeBtn);
    const inputArea = document.querySelector('.wc-chat-input-area');
    inputArea.parentNode.insertBefore(el, inputArea);
  }

  let ctxMenu = null;
  function removeCtxMenu() { if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; } }
  document.addEventListener('click', removeCtxMenu);
  document.addEventListener('scroll', removeCtxMenu, true);

  function showCtxMenu(x, y, msgIdx) {
    removeCtxMenu();
    const msg = chatMessages[msgIdx];
    if (!msg) return;
    ctxMenu = document.createElement('div');
    ctxMenu.className = 'wc-ctx-menu';
    const isUser = msg.type === 'user';
    const isSticker = msg.msgType === 'sticker';
    const actions = [];

    // 复制（非表情包）
    if (!isSticker) {
      actions.push({ label: '复制', fn: () => {
        navigator.clipboard.writeText(msg.text).catch(() => {});
      }});
    }
    // 引用
    actions.push({ label: '引用', fn: () => setQuote(msg) });
    // 编辑（仅用户文字消息）
    if (isUser && !isSticker) {
      actions.push({ label: '编辑', fn: () => editMsg(msgIdx) });
    }
    // 删除
    actions.push({ label: '删除', fn: () => deleteMsg(msgIdx) });

    actions.forEach(a => {
      const btn = document.createElement('button');
      btn.textContent = a.label;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        a.fn();
        removeCtxMenu();
      });
      ctxMenu.appendChild(btn);
    });

    document.body.appendChild(ctxMenu);
    const mw = ctxMenu.offsetWidth, mh = ctxMenu.offsetHeight;
    const vw = window.innerWidth, vh = window.innerHeight;
    ctxMenu.style.left = Math.min(x, vw - mw - 8) + 'px';
    ctxMenu.style.top = Math.min(y, vh - mh - 8) + 'px';
  }

  function editMsg(idx) {
    const msg = chatMessages[idx];
    if (!msg || msg.type !== 'user' || msg.msgType === 'sticker') return;
    const newText = prompt('编辑消息', msg.text);
    if (newText === null || newText.trim() === '' || newText.trim() === msg.text) return;
    msg.text = newText.trim();
    // 更新 DOM
    const rows = chatMsgArea.querySelectorAll('.wc-msg-row');
    if (rows[idx]) {
      const bubble = rows[idx].querySelector('.wc-msg-user');
      if (bubble) {
        const span = bubble.querySelector('span');
        if (span) span.textContent = msg.text;
        else bubble.textContent = msg.text;
      }
    }
    saveChat();
  }

  function deleteMsg(idx) {
    chatMessages.splice(idx, 1);
    const rows = chatMsgArea.querySelectorAll('.wc-msg-row');
    if (rows[idx]) rows[idx].remove();
    saveChat();
  }

  const chatMsgArea = document.getElementById('wc-chat-messages');
  let longPressTimer = null;
  let longPressTriggered = false;

  chatMsgArea.addEventListener('touchstart', (e) => {
    const row = e.target.closest('.wc-msg-row');
    if (!row) return;
    longPressTriggered = false;
    const touch = e.touches[0];
    longPressTimer = setTimeout(() => {
      longPressTriggered = true;
      const rows = Array.from(chatMsgArea.querySelectorAll('.wc-msg-row'));
      const idx = rows.indexOf(row);
      if (idx >= 0) showCtxMenu(touch.clientX, touch.clientY, idx);
    }, 500);
  }, { passive: true });
  chatMsgArea.addEventListener('touchmove', () => { clearTimeout(longPressTimer); }, { passive: true });
  chatMsgArea.addEventListener('touchend', (e) => {
    clearTimeout(longPressTimer);
    if (longPressTriggered) { e.preventDefault(); longPressTriggered = false; }
  });
  chatMsgArea.addEventListener('contextmenu', (e) => {
    const row = e.target.closest('.wc-msg-row');
    if (!row) return;
    e.preventDefault();
    const rows = Array.from(chatMsgArea.querySelectorAll('.wc-msg-row'));
    const idx = rows.indexOf(row);
    if (idx >= 0) showCtxMenu(e.clientX, e.clientY, idx);
  });

  // ===== 卡牌放大（雷诺曼） =====
  const zoomOverlay = document.getElementById('card-zoom-overlay');
  if (zoomOverlay) {
    const zoomImg = document.getElementById('card-zoom-img');
    const zoomName = document.getElementById('card-zoom-name');
    const zoomNameEn = document.getElementById('card-zoom-name-en');
    const zoomKeywords = document.getElementById('card-zoom-keywords');
    document.addEventListener('click', (e) => {
      const img = e.target.closest('.lenormand-card-img');
      if (!img) return;
      zoomImg.src = img.src;
      const card = img.closest('.lenormand-card');
      if (card) {
        zoomName.textContent = (function(_e){return _e?_e.textContent:""})(card.querySelector('.lenormand-card-name')) || '';
        zoomNameEn.textContent = (function(_e){return _e?_e.textContent:""})(card.querySelector('.lenormand-card-name-en')) || '';
        zoomKeywords.textContent = (function(_e){return _e?_e.textContent:""})(card.querySelector('.lenormand-card-keywords')) || '';
      }
      zoomOverlay.classList.add('show');
    });
    zoomOverlay.addEventListener('click', () => { zoomOverlay.classList.remove('show'); });
  }
});

  // 页面加载时检查未读红点
  if (typeof checkBtnUnread === 'function') {
    checkBtnUnread();
    // 每60秒检查一次
    setInterval(checkBtnUnread, 60000);


  }
