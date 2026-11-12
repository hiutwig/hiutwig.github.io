(() => {
  const root = document.querySelector('#fiti-app');
  const asset = '../../assets/fiti/';
  const exercises = [
    { name: 'Flexão de chão', image: 'imgImg1.png', reps: '12x', load: '—' },
    { name: 'Tríceps francês com barra nome enorme enorme gigante imenso', image: 'imgImg4.png', reps: '15x', load: '10 Kg' },
    { name: 'Supino reto com barra', image: 'imgImg2.png', reps: '10x', load: '20 Kg' }
  ];
  let completed = 0;
  let started = false;
  let lastTrigger;
  const icon = (file) => `<img class="app-icon" src="${asset}${file}.svg" alt="">`;
  const thumb = (exercise) => `<img class="app-thumb" src="${asset}${exercise.image}" alt="">`;
  const stats = (exercise) => `<dl class="app-stats"><div><span class="app-stat-icon">${icon('imgRefresh')}</span><div><dt>Repetições</dt><dd>${exercise.reps}</dd></div></div><div><span class="app-stat-icon">${icon('imgFitnessCenter')}</span><div><dt>Carga</dt><dd>${exercise.load}</dd></div></div></dl>`;
  const actions = `<div class="app-actions" aria-label="Ações do exercício"><button disabled title="Indisponível nesta demonstração">${icon('imgSquareFoot')}<span>Regulagem</span></button><button disabled title="Indisponível nesta demonstração">${icon('imgSync')}<span>Exercícios similares</span></button><button type="button" data-edit>${icon('imgEdit')}<span>Editar carga</span></button><button disabled title="Indisponível nesta demonstração">${icon('imgIconsMoreVert24Px')}<span>Mais</span></button></div>`;

  function render() {
    root.innerHTML = `
      <div class="app-status" aria-hidden="true"><span>9:41</span><span class="app-status-icons">▮▮▮ &nbsp; Wi-Fi &nbsp; ▰</span></div>
      <div class="app-island" aria-hidden="true"></div>
      <div class="app-list-view">
        <div class="app-topbar">${icon('imgSvg')}<span>Treinos</span></div>
        <div class="app-scroll">
          <div class="app-workout">Peito e tríceps <span aria-hidden="true">›</span></div>
          <details class="app-combined">
            <summary><span class="app-stack">${thumb(exercises[2])}${thumb(exercises[0])}</span><span class="app-chip">Conjugado</span><span class="app-count">${icon('imgSvg1')} 3 exercícios</span><span class="app-toggle">${icon('imgSvg2')}</span></summary>
            <div class="app-expanded">
              <p class="app-method"><strong>Conjugado</strong> · Executar em sequência · Descanso no final</p>
              <div class="app-sets" aria-label="Séries"><button type="button" data-complete>Concluir série 1</button><span class="app-set">2</span><span class="app-set">3</span></div>
              <ol class="app-movements">${exercises.map((exercise, index) => `
                <li><span class="app-link" aria-hidden="true">${icon('imgSvg1')}</span><div class="app-movement">
                  <button type="button" class="app-media-trigger" data-exercise="${index}" aria-label="Ver demonstração: ${exercise.name}">${thumb(exercise)}<span>${exercise.name}</span></button>
                  ${stats(exercise)}
                </div></li>`).join('')}</ol>
              <p class="app-rest">Descanso após os 3 exercícios: <strong>45″</strong></p>
              <div class="app-observation"><strong>Observação:</strong><p>Método: Realizar em sequência.</p></div>
              <button type="button" class="app-finish" data-finish>Concluir exercício</button>
              ${actions}
              <p class="app-feedback" role="status"></p>
            </div>
          </details>
          ${[
            ['72 - Supino reto com barra', 'imgImg2.png'],
            ['45 - Voador na máquina', 'imgImg3.png'],
            ['95 - Tríceps francês com barra nome enor...', 'imgImg4.png'],
            ['37 - Tríceps corda', 'imgImg5.png']
          ].map(([name, image], index) => `<div class="app-regular"><img class="app-thumb" src="${asset}${image}" alt=""><div>${index === 2 ? '<span class="app-chip app-progressive">Progressivo</span>' : ''}<span>${name}</span></div>${icon('imgSvg2')}</div>`).join('')}
        </div>
        <div class="app-bottom"><button type="button" data-start>Iniciar treino</button></div>
      </div>
      <section class="app-detail-view" aria-labelledby="app-exercise-title" hidden><div class="app-dialog-bar"><button type="button" data-back aria-label="Voltar aos exercícios">${icon('imgSvg')}</button><span>Treino</span></div><div class="app-demo-content"></div></section>
      <div class="app-home-indicator" aria-hidden="true"></div>`;
  }

  function showExercise(index, trigger) {
    const exercise = exercises[index];
    if (trigger?.closest('.app-list-view')) lastTrigger = trigger;
    root.querySelector('.app-demo-content').innerHTML = `
      <div class="app-demo-media"><img class="app-demo-photo" src="${asset}${exercise.image}" alt="Referência visual do exercício ${exercise.name}"></div>
      <h3 id="app-exercise-title" tabindex="-1">${exercise.name}</h3>
      <div class="app-instructions"><strong>Instruções:</strong><p>O texto de instruções e o arquivo de vídeo não foram fornecidos para esta demonstração.</p></div>
      <details class="app-muscles" open><summary>Grupos Musculares <span aria-hidden="true">⌄</span></summary><div class="app-muscle-illustration"><img src="${asset}imgZFrLlTTif.svg" width="236.044" height="269.795" alt="Ilustração dos grupos musculares apresentada no arquivo Figma"></div><div class="app-muscle-chips"><span>Bíceps</span><span>Peitoral</span><span>Dorsal</span></div></details>
      <nav class="app-demo-nav" aria-label="Demonstrações"><button type="button" data-exercise="${Math.max(0,index - 1)}" ${index === 0 ? 'disabled' : ''} aria-label="Exercício anterior">←</button><span>${index + 1} de 3</span><button type="button" data-exercise="${Math.min(2,index + 1)}" ${index === 2 ? 'disabled' : ''} aria-label="Próximo exercício">→</button></nav>`;
    root.querySelector('.app-list-view').hidden = true;
    root.querySelector('.app-detail-view').hidden = false;
    root.querySelector('.app-detail-view').scrollTop = 0;
    root.querySelector('[data-back]').focus({ preventScroll: true });
  }

  function back() {
    root.querySelector('.app-detail-view').hidden = true;
    root.querySelector('.app-list-view').hidden = false;
    lastTrigger?.focus({ preventScroll: true });
  }

  function updateSets() {
    const button = root.querySelector('[data-complete]');
    button.textContent = completed < 3 ? `Concluir série ${completed + 1}` : '3 séries concluídas';
    button.disabled = completed === 3;
    root.querySelector('.app-feedback').textContent = `${completed} de 3 séries concluídas.`;
    root.querySelectorAll('.app-set').forEach((set, index) => set.classList.toggle('is-done', completed >= index + 2));
  }

  root.addEventListener('click', (event) => {
    const media = event.target.closest('[data-exercise]');
    if (media) showExercise(Number(media.dataset.exercise), media);
    if (event.target.closest('[data-back]')) back();
    if (event.target.closest('[data-complete]')) { completed = Math.min(3, completed + 1); updateSets(); }
    if (event.target.closest('[data-finish]')) { completed = 3; updateSets(); root.querySelector('[data-finish]').textContent = 'Exercício concluído'; }
    if (event.target.closest('[data-start]')) {
      started = !started;
      root.querySelector('[data-start]').textContent = started ? 'Pausar treino' : 'Iniciar treino';
    }
    if (event.target.closest('[data-edit]')) root.querySelector('.app-feedback').textContent = 'A edição de carga não faz parte desta demonstração.';
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !root.querySelector('.app-detail-view').hidden) back();
  });
  document.querySelector('#fiti-reset').addEventListener('click', () => {
    completed = 0;
    started = false;
    render();
  });
  const screen = document.querySelector('.fiti-iphone-screen');
  const size = () => root.style.setProperty('--device-scale', screen.clientWidth / 393);
  new ResizeObserver(size).observe(screen);
  render();
  size();
})();
