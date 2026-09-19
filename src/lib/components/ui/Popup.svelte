<script lang="ts">
  import { onDestroy } from 'svelte'
  import { beforeNavigate } from '$app/navigation'
  import { useI18n } from '$lib/i18n-context'
  import Button from './Button.svelte'
  import Dialog from './Dialog.svelte'

  const { t } = useI18n()
  const id = $props.id()
  let element: HTMLDialogElement | undefined = $state()
  let requests = $state<
    {
      text: string
      confirmation: boolean
      resolve: (accepted: boolean) => void
    }[]
  >([])

  function open(text: string, confirmation: boolean) {
    return new Promise<boolean>((resolve) => {
      requests.push({ text, confirmation, resolve })
    })
  }

  export function confirm(text: string) {
    return open(text, true)
  }

  export async function alert(text: string) {
    await open(text, false)
  }

  function finish(accepted: boolean) {
    element?.close()
    requests.shift()?.resolve(accepted)
  }

  function dismiss() {
    element?.close()
    for (const request of requests) request.resolve(false)
    requests = []
  }

  beforeNavigate(dismiss)
  onDestroy(dismiss)
</script>

{#each requests.slice(0, 1) as request (request)}
  <Dialog
    modal
    bind:element
    role="alertdialog"
    aria-labelledby={id}
    oncancel={(event) => {
      event.preventDefault()
      finish(false)
    }}
  >
    <h2 {id}>{request.text}</h2>
    <div class="actions">
      {#if request.confirmation}
        <Button variant="secondary" onclick={() => finish(false)}
          >{t('Cancel')}</Button
        >
        <Button variant="danger" onclick={() => finish(true)}
          >{t('Confirm')}</Button
        >
      {:else}
        <Button onclick={() => finish(true)}>{t('Close')}</Button>
      {/if}
    </div>
  </Dialog>
{/each}

<style lang="scss">
  h2 {
    margin: 0;
    font-size: 1.1rem;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
</style>
