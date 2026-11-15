import { RESIDENTS, TRAIL_RESIDENTS, VOCAB_INTROS, getNeighbourPractice, getStreetRecap } from './neighbours-content.js?v=1.41';
import { residentPortrait, neighbourVignette } from './neighbours-art.js?v=1.39';
import { mountSpeakingPractice } from './speaking-practice.js?v=1.41';
import { iconMarkup } from './ui-icons.js?v=1.15';

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stageNames = { repeat: 'Repeat', use: 'Use it', create: 'Your turn' };

// Authored neighbourhood encounters. Recordings stay local: completing a round
// acknowledges practice, never claims recognition or pronunciation assessment.
export function createNeighbourEncounters({
  openModal, closeModal, listenButton, stopVoice,
  setAudioBusy = () => {}, getPreferences = () => ({}), setPreferences = () => {},
  getCompleted = () => [], getLesson, onBeginTrail, onFindResident = () => {},
  getRound = () => 0, saveRound = () => {}, timerMarkup = () => '',
  onRevisit = () => {},
}) {
  let recorder = null;
  const find = (selector) => document.querySelector(`#modal-root ${selector}`);
  function clearMedia() {
    recorder?.destroy();
    recorder = null;
    setAudioBusy(false);
  }
  function show(markup, type = 'neighbour') {
    clearMedia();
    openModal(markup, false, type);
    find('.modal')?.classList.add('neighbour-modal');
  }
  const identity = (id, caption = '') => {
    const resident = RESIDENTS[id];
    return `<div class="neighbour-identity"><div class="neighbour-portrait">${residentPortrait(id)}</div><div><strong><span lang="zh">${escape(resident.zh)}</span> <span>${escape(resident.en)}</span></strong><small>${escape(caption || resident.role)}</small></div></div>`;
  };
  const phrase = (p, { audio = false, visible = true, role = 'narrator' } = {}) => {
    const prefs = getPreferences();
    return `<div class="neighbour-phrase${visible ? '' : ' hidden'}"><div lang="zh" class="chinese">${escape(p?.zh)}</div><div class="pinyin${prefs.pinyin ? '' : ' hidden'}">${escape(p?.py)}</div><div class="translation${prefs.translations === false ? ' hidden' : ''}">${escape(p?.en)}</div>${audio ? listenButton(p.zh, role, true) : ''}</div>`;
  };
  function toggles() {
    const prefs = getPreferences();
    return `<div class="display-toggles"><label><input id="neighbour-pinyin" type="checkbox" ${prefs.pinyin ? 'checked' : ''}> Pinyin</label><label><input id="neighbour-english" type="checkbox" ${prefs.translations !== false ? 'checked' : ''}> English help</label></div>`;
  }
  function bindToggles() {
    for (const [id, key, selector] of [['neighbour-pinyin','pinyin','.pinyin'],['neighbour-english','translations','.translation']]) {
      const checkbox = find(`#${id}`);
      if (checkbox) checkbox.onchange = () => {
        setPreferences({ [key]: checkbox.checked });
        document.querySelectorAll(`#modal-root ${selector}`).forEach((el) => el.classList.toggle('hidden', !checkbox.checked));
      };
    }
  }

  function introduce(lesson, { resume = false, completed = false, onBegin } = {}) {
    const id = TRAIL_RESIDENTS[lesson.id];
    const cards = VOCAB_INTROS[lesson.id] || [];
    let position = 0;
    const draw = () => {
      const card = cards[position];
      if (!card) { onBegin(); return; }
      show(`<div class="modal-eyebrow">A LITTLE LOCAL KNOWLEDGE · ${position + 1} / ${cards.length}</div>
        ${identity(id, 'A warm welcome to the neighbourhood')}
        <h2 id="modal-title">${escape(lesson.title)}</h2>
        <div class="neighbour-scene">${neighbourVignette(id, card.visual)}</div>
        <div class="neighbour-word"><strong lang="zh">${escape(card.word.zh)}</strong><span>${escape(card.word.py)}</span><span>${escape(card.word.en)}</span>${listenButton(card.word.zh, id)}</div>
        ${card.context ? `<p class="neighbour-context-note translation${getPreferences().translations === false ? ' hidden' : ''}">${escape(card.context)}</p>` : ''}
        <div class="neighbour-context"><span class="neighbour-small-label">PHRASE PREVIEW</span>${card.lines.map((line) => phrase(line, { audio: true, role: id })).join('')}</div>
        ${toggles()}
        <div class="neighbour-pages" aria-label="Vocabulary introductions">${cards.map((c, i) => `<button data-vocab-page="${i}" aria-label="Introduce ${escape(c.word.en)}" aria-current="${i === position ? 'step' : 'false'}">${i + 1}</button>`).join('')}</div>
        <div class="modal-footer"><button class="secondary" id="neighbour-start">${resume ? 'Resume lesson' : completed ? 'Practise again' : 'Start lesson'}</button><button class="primary" id="neighbour-next">${position + 1 === cards.length ? 'Let’s go' : 'Next word'} ${iconMarkup('arrow-right')}</button></div>`, 'intro');
      bindToggles();
      find('#neighbour-start').onclick = onBegin;
      find('#neighbour-next').onclick = () => position + 1 === cards.length ? onBegin() : (position++, draw());
      document.querySelectorAll('[data-vocab-page]').forEach((b) => b.onclick = () => { position = Number(b.dataset.vocabPage); draw(); });
    };
    draw();
  }

  function practise(lesson, { onComplete, street = false, singleRound = null } = {}) {
    const rounds = singleRound ? [singleRound] : getNeighbourPractice(lesson);
    const savedRound = getRound(lesson.id);
    let position = street || !Number.isInteger(savedRound) ? 0 : Math.min(rounds.length - 1, Math.max(0, savedRound));
    const draw = () => {
      const round = rounds[position];
      const id = round.residentId || TRAIL_RESIDENTS[lesson.id];
      const modelVisible = round.stage === 'repeat';
      let ready = false;
      show(`<div class="modal-eyebrow">${street ? 'A FAMILIAR FACE · QUICK RECAP' : `PRACTISE TOGETHER · ${position + 1} / ${rounds.length}`}</div>
        ${identity(id, street ? 'Good to see you again' : 'A little more Mandarin, together')}
        <h2 id="modal-title">${escape(round.title)}</h2>
        ${street ? '' : timerMarkup(lesson.id)}
        ${street ? '' : `<div class="neighbour-stages" aria-label="Practice stages">${rounds.map((r, i) => `<span class="${i < position ? 'done' : i === position ? 'current' : ''}">${i + 1} · ${stageNames[r.stage]}</span>`).join('')}</div>`}
        <div class="neighbour-scene neighbour-scene-small">${neighbourVignette(id, round.visual)}</div>
        <p class="neighbour-prompt">${escape(round.prompt)}</p>
        ${round.stage !== 'repeat' && round.cue?.zh ? `<div class="neighbour-cue">${phrase(round.cue, { audio: true, role: id })}</div>` : ''}
        ${(round.stage === 'use' || round.openEnded) && round.support ? `<p class="neighbour-support">${escape(typeof round.support === 'string' ? round.support : round.support.zh || '')}</p>` : ''}
        <div class="neighbour-example" id="neighbour-example" ${modelVisible ? '' : 'hidden'}><span class="neighbour-small-label">${round.openEnded ? 'ONE EXAMPLE' : 'YOUR EXAMPLE'}</span>${phrase(round.model, { audio: true, role: id })}</div>
        ${round.openEnded ? '<p class="muted-note">Use words you know. Your answer can be different from the example.</p>' : ''}
        ${modelVisible ? '' : '<button class="secondary neighbour-reveal" id="neighbour-reveal" aria-expanded="false" aria-controls="neighbour-example">Hear an example</button>'}
        ${toggles()}
        <div id="neighbour-recorder"></div>
        <p class="neighbour-self-check" id="neighbour-self-check" role="status" hidden></p>
        <div class="modal-footer"><span class="muted-note">${street ? 'A quick practice, just for you.' : 'Your voice, at your pace.'}</span><button class="primary" id="neighbour-finish" disabled>${position + 1 === rounds.length ? (street ? 'Back to the neighbourhood' : 'Collect your stamp') : 'Next practice'} ${iconMarkup('arrow-right')}</button></div>`, street ? 'neighbour' : 'lesson');
      bindToggles();
      if (!modelVisible) find('#neighbour-reveal').onclick = () => {
        const example = find('#neighbour-example');
        const open = example.hidden;
        example.hidden = !open;
        find('#neighbour-reveal').setAttribute('aria-expanded', String(open));
        find('#neighbour-reveal').textContent = open ? 'Hide example' : 'Hear an example';
        if (open) example.querySelector('[data-speak]')?.click();
      };
      recorder = mountSpeakingPractice(find('#neighbour-recorder'), {
        filename: `trip-to-the-east-${lesson.id}-${round.stage}`,
        openEnded: round.openEnded,
        onBeforeRecord: stopVoice,
        onState(status) {
          const busy = ['requesting','recording','stopping','playing'].includes(status);
          setAudioBusy(busy);
          document.querySelectorAll('#modal-root [data-speak], #modal-root #neighbour-reveal').forEach((b) => b.disabled = busy);
        },
        onReady(value, { method } = {}) {
          ready = value;
          find('#neighbour-finish').disabled = !value;
          find('#neighbour-self-check').hidden = !value;
          find('#neighbour-self-check').textContent = method === 'aloud'
            ? 'You practised aloud. Try again, or keep going.'
            : round.openEnded
              ? 'Listen back. Did you say what you wanted to say? You can try again.'
              : 'Listen back and compare. You can try again whenever you like.';
          find('.neighbour-portrait')?.classList.toggle('practice-ready', value);
        },
      });
      find('#neighbour-finish').onclick = () => {
        if (!ready) return;
        if (position + 1 < rounds.length) {
          position++;
          saveRound(lesson.id, position);
          draw();
        } else {
          clearMedia();
          if (street) onRevisit(id, lesson.id);
          onComplete?.();
        }
      };
    };
    draw();
  }

  function meet(id) {
    if (!RESIDENTS[id]) return;
    const resident = RESIDENTS[id];
    const completed = getCompleted();
    const lessons = Object.keys(TRAIL_RESIDENTS).map(getLesson).filter(Boolean);
    const recap = getStreetRecap(id, completed, lessons);
    const trails = Object.entries(TRAIL_RESIDENTS).filter(([, who]) => who === id).map(([trail]) => getLesson(trail)).filter(Boolean);
    show(`<div class="modal-eyebrow">YOUR CHONGQING NEIGHBOURS</div>${identity(id)}
      <h2 id="modal-title">${completed.length ? 'Good to see you again.' : 'Welcome to our neighbourhood.'}</h2>
      <div class="neighbour-scene">${neighbourVignette(id, trails[0]?.id === 'cafe' ? 'tea' : trails[0]?.id === 'market' ? 'yuan' : trails[0]?.id === 'gate' ? 'where' : 'hotpot')}</div>
      <p class="modal-intro">${escape(resident.description)}</p>
      <div class="neighbour-visit-links">${trails.map((lesson) => `<button class="secondary" data-neighbour-trail="${lesson.id}">${escape(lesson.title)} ${iconMarkup('arrow-right')}</button>`).join('')}</div>
      <div class="modal-footer"><button class="secondary" id="neighbour-find">Find ${escape(resident.en)}</button>${recap ? '<button class="primary" id="neighbour-recap">A little recap '+iconMarkup('arrow-right')+'</button>' : '<button class="primary" id="neighbour-goodbye">See you soon '+iconMarkup('check')+'</button>'}</div>`);
    document.querySelectorAll('[data-neighbour-trail]').forEach((b) => b.onclick = () => onBeginTrail(b.dataset.neighbourTrail));
    find('#neighbour-find').onclick = () => { closeModal(); onFindResident(id); };
    if (recap) find('#neighbour-recap').onclick = () => {
      const lesson = getLesson(recap.trailId || recap.lessonId || completed.at(-1));
      practise(lesson, { street: true, singleRound: recap.round || recap, onComplete: closeModal });
    };
    else find('#neighbour-goodbye').onclick = closeModal;
  }
  function directory() {
    show(`<div class="modal-eyebrow">FAMILIAR FACES · 重庆邻里</div><h2 id="modal-title">Meet your neighbours</h2><p class="modal-intro">A hello, a little story, a chance to practise.</p><div class="neighbour-directory">${Object.entries(RESIDENTS).map(([id,r]) => `<button class="neighbour-person" data-meet-resident="${id}"><span class="neighbour-directory-portrait">${residentPortrait(id)}</span><strong lang="zh">${escape(r.zh)}</strong><span>${escape(r.en)}</span><small>${escape(r.role)}</small></button>`).join('')}</div>`);
    document.querySelectorAll('[data-meet-resident]').forEach((b) => b.onclick = () => meet(b.dataset.meetResident));
  }
  return { introduce, practise, meet, directory, clearMedia, destroy: clearMedia };
}
