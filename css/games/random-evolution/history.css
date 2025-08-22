/* ===============================
   History rail (RIGHT)
   =============================== */

.revo-history{
  position:relative;
  height: var(--stage-max);
  width: var(--history-w);
  background:rgba(255,255,255,.06);
  border-radius:14px;
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,.05),
    inset 0 8px 22px rgba(0,0,0,.35);
  overflow: hidden; /* no scrollbars; we rotate tiles in JS */
}

.revo-history .history-track{
  position:relative;
  display:flex;
  flex-direction: column;
  gap: var(--hist-gap);
  padding: var(--hist-gap);
  height: 100%;
}

/* Individual history tiles (image over label) */
.hist-item{
  position:relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  /* Entrance micro animation */
  transform: scale(0.96);
  opacity: 0;
  animation: hist-in 200ms cubic-bezier(.2,1,.2,1) forwards;
}

/* Required for the pop-in. If you centralize animations elsewhere,
   keep a copy there or remove the animation above. */
@keyframes hist-in {
  to { transform: scale(1); opacity: 1; }
}

/* Image frame (holds background & rim) */
.hist-imgwrap{
  width: 100%;
  height: var(--hist-thumb);
  border-radius: 10px;
  overflow: hidden;
  display: grid;
  place-items: center;

  /* Base frame */
  border: 2px solid rgba(255,255,255,.08);
  box-shadow:
    0 0 0 1px rgba(255,255,255,.04) inset,
    0 2px 10px rgba(0,0,0,.25);
}

/* Background by action */
.hist-imgwrap[data-action="cancel"]{
  background: rgba(255,255,255,.05);
}
.hist-imgwrap[data-action="accept"]{
  background: linear-gradient(180deg, rgba(18,25,41,.65), rgba(11,16,27,.65));
}
/* Neutral start background */
.hist-imgwrap[data-action="start"]{
  background: linear-gradient(180deg, rgba(10,14,24,.75), rgba(7,10,18,.75));
}

/* Rim tint by correctness */
.hist-imgwrap[data-correct="true"]{
  box-shadow:
    0 0 0 1px rgba(122,162,247,.25) inset,
    0 0 0 2px rgba(122,162,247,.18),
    0 4px 12px rgba(0,0,0,.28);
}
.hist-imgwrap[data-correct="false"]{
  box-shadow:
    0 0 0 1px rgba(247,118,142,.30) inset,
    0 0 0 2px rgba(247,118,142,.20),
    0 4px 12px rgba(0,0,0,.28);
}
/* Neutral rim */
.hist-imgwrap[data-correct="neutral"]{
  box-shadow:
    0 0 0 1px rgba(255,255,255,.14) inset,
    0 0 0 2px rgba(255,255,255,.10),
    0 4px 12px rgba(0,0,0,.28);
}

/* Thumbnail image */
.hist-thumb{
  width: 100%;
  height: 100%;
  object-fit: cover;
  image-rendering: auto;
  pointer-events: none;
}

/* Dex label under image */
.hist-label{
  font: 800 clamp(9px, 1.6vmin, 11px)/1.1 ui-monospace,SFMono-Regular,Menlo,monospace;
  color: var(--muted);
  letter-spacing: .1px;
  user-select: none;
}

/* Hide history on very tight screens if needed */
@media (max-width: 420px){
  .revo-stage-wrap { grid-template-columns: auto 1fr; }
  .revo-history { display:none; }
}
