(function () {
  const input = document.getElementById('barcodeInput');
  if (!input) return;

  // ===== Toast (popup) =====
  function showToast(message, isError = false, title = null) {
  // Reaproveita overlay se já existir
  let overlay = document.getElementById('toast-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'toast-overlay';
    overlay.className = 'toast-overlay';
    document.body.appendChild(overlay);
  }

  // Limpa qualquer card anterior
  overlay.innerHTML = '';

  // Card
  const card = document.createElement('div');
  card.className = `toast-card ${isError ? 'error' : 'success'}`;

  // Ícone simples (✓ / !)
  const icon = document.createElement('div');
  icon.className = 'toast-icon';
  icon.textContent = isError ? '!' : '✓';

  // Título + texto
  const contentWrap = document.createElement('div');
  const h = document.createElement('div');
  h.className = 'toast-title';
  h.textContent = title || (isError ? 'Ops, algo deu errado' : 'Presença registrada');
  const p = document.createElement('div');
  p.className = 'toast-text';
  p.textContent = message || (isError ? 'Tente novamente.' : 'Sucesso.');
  contentWrap.appendChild(h);
  contentWrap.appendChild(p);

  // Botão fechar
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-close';
  close.textContent = 'Fechar';

  // Linha
  const row = document.createElement('div');
  row.className = 'toast-row';
  row.appendChild(icon);
  row.appendChild(contentWrap);
  row.appendChild(close);

  card.appendChild(row);
  overlay.appendChild(card);

  // Mostra
  overlay.classList.add('is-visible');
  requestAnimationFrame(() => card.classList.add('appear'));

  // Fechar (sem roubar foco do input)
  const kill = () => {
    card.classList.remove('appear');
    overlay.classList.remove('is-visible');
    setTimeout(() => {
      overlay.innerHTML = '';
      // re-foca o scanner se existir
      const input = document.getElementById('barcodeInput');
      if (input) input.focus();
    }, 180);
  };

  close.addEventListener('click', kill);
  card.addEventListener('click', (e) => {
    // clique fora do botão também fecha, mas só na área do card
    if (e.target === card) kill();
  });

  // Auto-dismiss: sucesso 2.6s | erro 4.2s
  setTimeout(kill, isError ? 4200 : 2600);
}
  // ===== fim toast =====

  const focusScanner = () => setTimeout(() => input.focus(), 0);
  focusScanner();
  document.addEventListener('click', focusScanner);
  document.addEventListener('keydown', (e) => {
    if (e.key.length === 1 || e.key === 'Enter') focusScanner();
  });

  const qs = new URLSearchParams(window.location.search);
  const turmaParam = qs.get('turma') || null;
  const dataParam = qs.get('data') || null;

  // Recarrega chamada com ?data=
  const dateInput = document.getElementById('dataPicker');
  if (dateInput) {
    dateInput.addEventListener('change', () => {
      const newDate = dateInput.value; // YYYY-MM-DD
      const newQS = new URLSearchParams(window.location.search);
      if (newDate) newQS.set('data', newDate); else newQS.delete('data');
      window.location.search = newQS.toString();
    });
  }

  const onEnter = () => {
    const ra = (input.value || '').trim();
    if (!ra) return;

    const selectedDate =
      (dateInput && dateInput.value) ? dateInput.value :
      (dataParam || null);

    const payload = { ra };
    if (turmaParam) payload.turma = turmaParam;
    if (selectedDate) payload.data = selectedDate;

    fetch('/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(r => r.json().catch(() => ({})).then(j => ({ ok: r.ok, status: r.status, data: j })))
      .then(({ ok, status, data }) => {
        if (!ok || data.error) {
          const msg = data.error || `Falha no scan (HTTP ${status}).`;
          showToast(msg, true);               // <<< popup de erro
          input.value = '';
          focusScanner();
          return;
        }

        // Atualiza tabela (se estiver em chamada.html)
        const row = document.querySelector(`tr[data-ra="${data.ra}"]`);
        if (row) {
          const horaCell = row.querySelector('.hora');
          const presCell = row.querySelector('.presenca');
          if (horaCell) horaCell.textContent = data.hora || '';
          if (presCell) presCell.textContent = data.presenca || 'Presente';
        }

        // Feedback textual (index.html já tem #scanStatus)
        const statusBox = document.getElementById('scanStatus');
        if (statusBox) {
          statusBox.textContent = `OK: ${data.nome} — ${data.turma} — ${data.hora}`;
        }

        // <<< popup de sucesso (aparece no index e na chamada)
        showToast(`OK: ${data.nome} — ${data.turma} — ${data.hora}`);

        input.value = '';
        focusScanner();
      })
      .catch(err => {
        console.error(err);
        showToast('Erro de rede ao registrar o scan.', true); // <<< popup erro
        input.value = '';
        focusScanner();
      });
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter();
    }
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter();
    }
  });
})();