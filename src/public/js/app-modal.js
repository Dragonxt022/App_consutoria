(function () {
  if (window.appModal) return;

  let modalRoot = null;
  let titleNode = null;
  let messageNode = null;
  let inputWrapNode = null;
  let inputNode = null;
  let cancelButton = null;
  let confirmButton = null;
  let resolver = null;
  let activeMode = 'alert';
  let previousActiveElement = null;

  function ensureModal() {
    if (modalRoot) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div id="app-modal-root" class="fixed inset-0 z-[120] hidden items-center justify-center p-4 sm:p-6">
        <div class="absolute inset-0 bg-slate-950/65 backdrop-blur-sm" data-modal-overlay></div>
        <div class="relative z-10 w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
          <div class="bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_52%),linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] px-6 pb-6 pt-7 sm:px-7">
            <div class="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 class="text-xl font-black tracking-tight text-slate-900" data-modal-title>Confirmação</h2>
            <p class="mt-2 text-sm leading-6 text-slate-600" data-modal-message></p>
            <div class="mt-5 hidden" data-modal-input-wrap>
              <input data-modal-input type="text" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100" />
            </div>
          </div>
          <div class="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-5 sm:flex-row sm:justify-end sm:px-7">
            <button type="button" data-modal-cancel class="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50">Cancelar</button>
            <button type="button" data-modal-confirm class="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800">Confirmar</button>
          </div>
        </div>
      </div>
    `;

    modalRoot = wrapper.firstElementChild;
    titleNode = modalRoot.querySelector('[data-modal-title]');
    messageNode = modalRoot.querySelector('[data-modal-message]');
    inputWrapNode = modalRoot.querySelector('[data-modal-input-wrap]');
    inputNode = modalRoot.querySelector('[data-modal-input]');
    cancelButton = modalRoot.querySelector('[data-modal-cancel]');
    confirmButton = modalRoot.querySelector('[data-modal-confirm]');

    document.body.appendChild(modalRoot);

    modalRoot.querySelector('[data-modal-overlay]').addEventListener('click', () => {
      if (activeMode === 'alert') {
        close(true);
        return;
      }
      close(false);
    });

    cancelButton.addEventListener('click', () => close(false));
    confirmButton.addEventListener('click', () => {
      if (activeMode === 'prompt') {
        close(inputNode.value);
        return;
      }
      close(true);
    });

    inputNode.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        confirmButton.click();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (!modalRoot || modalRoot.classList.contains('hidden')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (activeMode === 'alert') {
          close(true);
          return;
        }
        close(false);
      }
    });
  }

  function open(options) {
    ensureModal();

    activeMode = options.mode || 'alert';
    previousActiveElement = document.activeElement;
    titleNode.textContent = options.title || (activeMode === 'alert' ? 'Aviso' : 'Confirmar ação');
    messageNode.textContent = options.message || '';
    confirmButton.textContent = options.confirmText || (activeMode === 'alert' ? 'Entendi' : 'Confirmar');
    cancelButton.textContent = options.cancelText || 'Cancelar';
    cancelButton.classList.toggle('hidden', activeMode === 'alert');
    inputWrapNode.classList.toggle('hidden', activeMode !== 'prompt');

    if (activeMode === 'prompt') {
      inputNode.value = options.defaultValue || '';
      inputNode.placeholder = options.placeholder || '';
      setTimeout(() => inputNode.focus(), 10);
    } else {
      setTimeout(() => confirmButton.focus(), 10);
    }

    modalRoot.classList.remove('hidden');
    modalRoot.classList.add('flex');
    document.body.classList.add('overflow-hidden');

    return new Promise((resolve) => {
      resolver = resolve;
    });
  }

  function close(result) {
    if (!modalRoot || modalRoot.classList.contains('hidden')) return;

    modalRoot.classList.add('hidden');
    modalRoot.classList.remove('flex');
    document.body.classList.remove('overflow-hidden');

    const resolve = resolver;
    resolver = null;
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus();
    }

    if (resolve) {
      resolve(result);
    }
  }

  async function handleConfirmSubmit(form) {
    const message = form.getAttribute('data-confirm-message');
    if (!message || form.dataset.modalConfirmed === 'true') return;

    const confirmed = await window.appModal.confirm(message, {
      title: form.getAttribute('data-confirm-title') || 'Confirmar ação',
      confirmText: form.getAttribute('data-confirm-button') || 'Continuar',
      cancelText: form.getAttribute('data-cancel-button') || 'Cancelar'
    });

    if (!confirmed) return;

    form.dataset.modalConfirmed = 'true';
    form.submit();
  }

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!form.matches('[data-confirm-message]')) return;
    if (form.dataset.modalConfirmed === 'true') {
      delete form.dataset.modalConfirmed;
      return;
    }

    event.preventDefault();
    handleConfirmSubmit(form);
  }, true);

  window.appModal = {
    alert(message, options = {}) {
      return open({
        mode: 'alert',
        title: options.title || 'Aviso',
        message,
        confirmText: options.confirmText || 'Entendi'
      });
    },
    confirm(message, options = {}) {
      return open({
        mode: 'confirm',
        title: options.title || 'Confirmar ação',
        message,
        confirmText: options.confirmText || 'Confirmar',
        cancelText: options.cancelText || 'Cancelar'
      });
    },
    prompt(message, options = {}) {
      return open({
        mode: 'prompt',
        title: options.title || 'Informar valor',
        message,
        confirmText: options.confirmText || 'Salvar',
        cancelText: options.cancelText || 'Cancelar',
        defaultValue: options.defaultValue || '',
        placeholder: options.placeholder || ''
      });
    }
  };
})();
