>

With [built-in AI APIs](https://developer.chrome.com/docs/ai/built-in-apis), your web application can
perform AI-powered tasks without needing to deploy or manage its own AI models.
We are working to [standardize these APIs across browsers](https://developer.chrome.com/docs/ai/get-started#standards_process).

> [!TIP]
> **Tip:** If you're new to AI on the web, we recommend that you read our [web AI glossary and concepts](https://developer.chrome.com/docs/ai/glossary).

## Requirements

To use built-in AI, there are model and hardware requirements.

### Models

> [!IMPORTANT]
> **Important** : The built-in foundation model is a generative AI model. Before you build with APIs that use it, you should review the [People + AI Guidebook](https://pair.withgoogle.com/guidebook/) for best practices, methods, and examples for designing with AI.

The Translator and Language Detector APIs use expert models. All other APIs
use a language model, designed to run locally on desktops and laptops.

The Summarizer API, Writer API, Rewriter API, and Proofreader API, only support
text-to-text modality. The
[Prompt API has multimodal capabilities](https://developer.chrome.com/blog/ai-api-updates-io25#prompt_api_multimodal).

#### The models in Chrome

Chrome uses expert and foundation language models. These models are not available
on mobile devices.

From Chrome 149, the models support English, Spanish, Japanese, German, and French for input
and output text.

### Hardware

The following requirements exist for developers and the users who operate features using these
APIs in Chrome. Other browsers may have different operating requirements.

The **Language Detector** and **Translator APIs** work in Chrome on
desktop. These APIs do not work on mobile devices.

The **Prompt API** , **Summarizer API** , **Writer API** ,
**Rewriter API** , and **Proofreader API** work in Chrome when the
following conditions are met:

- **Operating system** : Windows 10 or 11; macOS 13+ (Ventura and onwards); Linux; or ChromeOS (from Platform 16389.0.0 and onwards) on [Chromebook Plus](https://www.google.com/chromebook/chromebookplus/) devices. Chrome for Android, iOS, and ChromeOS on non-Chromebook Plus devices are not yet supported by the APIs which use foundation models.
- **Storage** : At least 22 GB of free space on the volume that contains your Chrome profile.

  > [!NOTE]
  > Built-in models should be significantly smaller. The exact size may vary slightly with updates.

- **GPU or CPU** : Built-in models can run with GPU or CPU.
  - **GPU**: Strictly more than 4 GB of VRAM.
  - **CPU**: 16 GB of RAM or more and 4 CPU cores or more.
  - **Note**: The Prompt API with audio input requires a GPU.
- **Network** : Unlimited data or an unmetered connection.

  > [!IMPORTANT]
  > **Key term** : A [metered connection](https://support.microsoft.com/windows/metered-connections-in-windows-7b33928f-a144-b265-97b6-f2e95a87c408) is a data-limited internet connection. Wi-Fi and ethernet connections tend to be unmetered by default, while cellular connections are often metered.

  > [!NOTE]
  > **Note**: The network requirement is only for the initial download of the model. Subsequent use of the model does not require a network connection. No data is sent to Google or any third party when using the model.

Gemini Nano's exact size may vary as the browser updates the model. To determine the current size, visit `chrome://on-device-internals`.

> [!NOTE]
> **Note**: If the available storage space falls to less than 10 GB after the download, the model is removed from your device. The model redownloads once the requirements are met.

## Start building

There are [several built-in AI APIs available](https://developer.chrome.com/docs/ai/built-in-apis) at
different stages of development. Some are in Chrome stable, some are available
participants of origin trials, and others are only available to
[Early Preview Program participants](https://developer.chrome.com/docs/ai/join-epp).

Each API has its own set of instructions to get started and download the model,
both for local prototyping and in production environments with the origin
trials.

- [Translator API](https://developer.chrome.com/docs/ai/translator-api)
- [Language Detector API](https://developer.chrome.com/docs/ai/language-detection)
- [Summarizer API](https://developer.chrome.com/docs/ai/summarizer-api)
- [Writer API](https://developer.chrome.com/docs/ai/writer-api) and [Rewriter API](https://developer.chrome.com/docs/ai/rewriter-api)
- [Proofreader API](https://developer.chrome.com/docs/ai/proofreader-api)
- [Prompt API](https://developer.chrome.com/docs/ai/prompt-api)

All of these APIs can be used when building Chrome Extensions.

> [!NOTE]
> **Note:** If the API is available in an origin trial, you must [register your extension for the origin trial](https://developer.chrome.com/docs/extensions/how-to/web-platform/origin-trials).

### Model download

APIs are built into Chrome, as are the models. The first time a user interacts
with these APIs, the model must be downloaded to the browser.

To determine if an API is usable and ready, call the asynchronous
`availability()` function, which returns a promise with one of the following
values:

- `"unavailable"`: The user's device or requested session options are not supported. The device may have insufficient power or disk space.
- `"downloadable"`: Additional downloads are needed to create a session, which may include an expert model, a language model, or fine-tuning. [User activation](https://developer.chrome.com/docs/ai/get-started#user-activation) may be required to call `create()`.
- `"downloading"`: Downloads are ongoing and must complete before you can use a a session.
- `"available"`: You can create a session immediately.

Some APIs require additional options when calling availability. For example,
the [Prompt API](https://developer.chrome.com/docs/ai/prompt-api#add_expected_input_and_output)
requires declaring language support:

    // Makes sure the model is available for English and Japanese input text,
    // supports image input, and can generate English output.
    await LanguageModel.availability({
      expectedInputs: [{type: "text", languages: ["en", "ja"]}, {type: "image"}],
      expectedOutputs: [{type: "text", languages: ["en"]}],
    });

### User activation

If the device can support built-in AI APIs, but the model is not yet
downloaded (that is, when calling `availability()` returns `"downloadable"` or
`"downloading"`), the user must meaningfully interact with your page for your
application to start a session with `create()`.

Use the [`UserActivation.isActive`](https://developer.mozilla.org/docs/Web/API/UserActivation)
property to confirm a user has directly interacted with the page since the page
finished loading. This can include a tap, click, key press, `mousedown`, or
other [sticky activation events](https://developer.mozilla.org/docs/Glossary/Sticky_activation).

    // Check for user activation.
    if (navigator.userActivation.isActive) {
      // Create an instance of a built-in API
    }

For example with the [Summarizer API](https://developer.chrome.com/docs/ai/summarizer-api), you could
ask users to interact with a button that says "Summarize" to activate
`Summarizer.create()`, or you can create the summarizer once a user has started
typing, a `keydown` event.

### Use APIs on localhost

All of the APIs are available on `localhost` in Chrome.

1. Go to `chrome://flags/#optimization-guide-on-device-model`.
2. Select **Enabled**.
3. Click **Relaunch** or restart Chrome.

For APIs which use Gemini Nano, you must also set
`chrome://flags/#prompt-api-for-gemini-nano` to **Enabled** or
**Enabled multilingual** . You can confirm the model has downloaded and works
as intended in the [DevTools Console](https://developer.chrome.com/docs/devtools/console#open_the_console).
Run `await LanguageModel.availability();` in the console.

#### Troubleshoot localhost

If the flags don't appear in `chrome://flags`, make sure you've downloaded
the [latest version of Chrome](https://support.google.com/chrome/answer/95414).

If the model doesn't work as expected, follow these steps:

1. Restart Chrome.
2. Go to `chrome://on-device-internals`.
3. Select the **Model Status** tab and make sure there are no errors.
4. Open DevTools and type `LanguageModel.availability();` into the console. This should return `available`.

If necessary, wait for some time and repeat these steps.

## Standards process

We're working to [standardize these APIs](https://www.w3.org/standards/about/),
so that they work across all browsers. This means we have proposed the APIs to
the web platforms community, and moved them to the
[W3C Web Incubator Community Group](https://wicg.io/) for further discussion.

We are requesting feedback from the W3C, Mozilla, and WebKit for each API.

## Engage and share feedback

If you try built-in AI and have feedback, we'd love to hear it.

- Discover all of the [built-in AI APIs](https://developer.chrome.com/docs/ai/built-in-apis).
- [Join the Early Preview Program](https://developer.chrome.com/docs/ai/join-epp) for an early look at new APIs and access to our mailing list.
- If you have feedback on Chrome's implementation, file a [Chromium bug](https://issues.chromium.org/issues/new?component=1583300&priority=P2&type=bug&template=0&noWizard=true).
- Learn about [web standards](https://www.w3.org/standards/about/).
