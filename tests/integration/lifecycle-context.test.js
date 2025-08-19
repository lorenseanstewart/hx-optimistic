import { describe, it, expect, vi } from 'vitest';
import { createOptimisticElement, triggerHtmxEvent, nextTick, createTemplate } from '../helpers/test-utils.js';

describe('Lifecycle and Context', () => {
  it('emits lifecycle events', async () => {
    const el = createOptimisticElement(
      '<button hx-post="/api/test" hx-ext="optimistic">X</button>',
      { values: { textContent: 'Loading...' }, errorMessage: 'E', delay: 10 }
    );
    triggerHtmxEvent(el, 'htmx:beforeRequest');
    await nextTick();
    expect(global.htmx.trigger).toHaveBeenCalledWith(el, 'optimistic:applied', expect.objectContaining({ config: expect.any(Object) }));
    triggerHtmxEvent(el, 'htmx:responseError', { xhr: { status: 500, statusText: 'Server Error' }, elt: el });
    await nextTick();
    expect(global.htmx.trigger).toHaveBeenCalledWith(el, 'optimistic:error', expect.objectContaining({ config: expect.any(Object), detail: expect.any(Object) }));
    await new Promise(r => setTimeout(r, 30));
    expect(global.htmx.trigger).toHaveBeenCalledWith(el, 'optimistic:reverted', expect.objectContaining({ config: expect.any(Object) }));
  });

  it('supports context in templates and error templates', async () => {
    const t1 = createTemplate('ctx-tpl', '<div>${username}</div>');
    const t2 = createTemplate('err-tpl', '<div>${username}-${status}</div>');
    const el = createOptimisticElement(
      '<button hx-post="/api/test" hx-ext="optimistic">X</button>',
      { template: '#ctx-tpl', context: { username: 'Alice' }, errorTemplate: '#err-tpl', delay: 10 }
    );
    triggerHtmxEvent(el, 'htmx:beforeRequest');
    await nextTick();
    expect(el.innerHTML).toContain('Alice');
    triggerHtmxEvent(el, 'htmx:responseError', { xhr: { status: 404, statusText: 'Not Found' }, elt: el });
    await nextTick();
    expect(el.innerHTML).toContain('Alice-404');
    t1.remove();
    t2.remove();
  });

  it('warns when template selectors do not resolve', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = createOptimisticElement(
      '<button hx-post="/api/test" hx-ext="optimistic">X</button>',
      { template: '#missing', errorTemplate: '#missing-err', delay: 0, errorMessage: '' }
    );
    triggerHtmxEvent(el, 'htmx:beforeRequest');
    await nextTick();
    triggerHtmxEvent(el, 'htmx:responseError', { xhr: { status: 500, statusText: 'E' }, elt: el });
    await nextTick();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('restores attributes and dataset, and can reprocess on revert', async () => {
    const spy = vi.spyOn(global.htmx, 'process');
    const el = createOptimisticElement(
      '<div id="target" title="t" data-foo="bar" hx-post="/api/test" hx-ext="optimistic">Y</div>',
      { values: { className: 'changed', 'data-foo': 'baz' }, errorMessage: 'E', delay: 10, reprocessOnRevert: true }
    );
    triggerHtmxEvent(el, 'htmx:beforeRequest');
    await nextTick();
    expect(el.dataset.foo).toBe('baz');
    triggerHtmxEvent(el, 'htmx:responseError', { xhr: { status: 500, statusText: 'E' }, elt: el });
    await new Promise(r => setTimeout(r, 30));
    expect(el.dataset.foo).toBe('bar');
    expect(el.getAttribute('title')).toBe('t');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('supports swap modes beforeend and afterbegin', async () => {
    const el = createOptimisticElement(
      '<div id="box" hx-post="/api/test" hx-ext="optimistic">A</div>',
      { template: '<span>B</span>', swap: 'beforeend' }
    );
    triggerHtmxEvent(el, 'htmx:beforeRequest');
    await nextTick();
    expect(el.innerHTML.endsWith('<span>B</span>')).toBe(true);

    const el2 = createOptimisticElement(
      '<div id="box2" hx-post="/api/test" hx-ext="optimistic">A</div>',
      { template: '<span>B</span>', swap: 'afterbegin' }
    );
    triggerHtmxEvent(el2, 'htmx:beforeRequest');
    await nextTick();
    expect(el2.innerHTML.startsWith('<span>B</span>')).toBe(true);
  });

  it('removes custom optimistic class on success', async () => {
    const el = createOptimisticElement(
      '<button hx-post="/api/test" hx-ext="optimistic">X</button>',
      { values: { textContent: 'Loading...' }, class: 'custom-opt' }
    );
    triggerHtmxEvent(el, 'htmx:beforeRequest');
    await nextTick();
    expect(el.classList.contains('custom-opt')).toBe(true);
    triggerHtmxEvent(el, 'htmx:afterSwap');
    await nextTick();
    expect(el.classList.contains('custom-opt')).toBe(false);
  });
});


