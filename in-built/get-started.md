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



<br />


Published: May 20, 2025

<br />

We have so many built-in AI API updates to announce at Google I/O 2025. Starting
from Chrome 138, the [Summarizer API](https://developer.chrome.com/docs/ai/summarizer-api),
[Language Detector API](https://developer.chrome.com/docs/ai/language-detection), and
[Translator API](https://developer.chrome.com/docs/ai/translator-api) are available in stable, as is the
[Prompt API for use in Chrome Extensions](https://developer.chrome.com/docs/extensions/ai/prompt-api).

And we're not done innovating yet!

- The [Writer and Rewriter APIs are in origin trials](https://developer.chrome.com/blog/ai-api-updates-io25#writer_rewriter_origin_trials).
- The [Prompt API's multimodal capabilities](https://developer.chrome.com/blog/ai-api-updates-io25#prompt_api_multimodal) are available to Early Preview Program (EPP) participants.
- The new [Proofreader API](https://developer.chrome.com/blog/ai-api-updates-io25#proofreader_epp) will soon be available for EPP Participants.

Check out all of the [built-in AI API statuses](https://developer.chrome.com/docs/ai/built-in-apis) and
[everything on the web that happened at Google I/O 2025](https://developer.chrome.com/blog/web-at-io25).

## Writer and Rewriter APIs in origin trials

| API | Explainer | Web | Extensions | Chrome Status | Intent |
|---|---|---|---|---|---|
| **[Writer API](https://developer.chrome.com/docs/ai/writer-api)** | [GitHub](https://github.com/explainers-by-googlers/writing-assistance-apis/) | ![Developer trial](https://developer.chrome.com/static/images/experiment.svg) Developer trial | ![Developer trial](https://developer.chrome.com/static/images/experiment.svg) Developer trial | [View](https://chromestatus.com/feature/4712595362414592) | [Intent to Experiment](https://groups.google.com/a/chromium.org/g/blink-dev/c/HCSzUSI8kI8/m/A3I4o5YlBAAJ) |
| **[Rewriter API](https://developer.chrome.com/docs/ai/rewriter-api)** | [GitHub](https://github.com/explainers-by-googlers/writing-assistance-apis/) | ![Developer trial](https://developer.chrome.com/static/images/experiment.svg)Developer trial | ![Developer trial](https://developer.chrome.com/static/images/experiment.svg)Developer trial | [View](https://chromestatus.com/feature/5112320150470656) | [Intent to Experiment](https://groups.google.com/a/chromium.org/g/blink-dev/c/eLNXoxgx8CU/m/KHTF-pslBAAJ) |

The [Writer API](https://developer.chrome.com/docs/ai/writer-api) and [Rewriter API](https://developer.chrome.com/docs/ai/rewriter-api)
are now available in origin trials.

For those new to [origin trials](https://developer.chrome.com/docs/web-platform/origin-trials), these are
time-limited programs open to all developers, offering early access to
experimental platform features. There may be temporary usage limits, however,
developers can integrate these features for live testing and gathering user
feedback, with the goal of informing a future launch.

### Use cases

With the [Writer API](https://developer.chrome.com/docs/ai/writer-api), you can help users write new
content, based on an initial idea. For example:

- Support users content creation, including reviews, blog posts, or emails.
- Help users write better support requests.
- Draft an introduction for a series of work samples to better capture certain skills.

With the [Rewriter API](https://developer.chrome.com/docs/ai/rewriter-api), refine your users'
existing text. For example:

- Rewrite a short email so that it sounds more polite and formal.
- Suggest edits to customer reviews to help other customers understand the feedback or remove toxicity.
- Format content to meet the expectations of certain audiences.

## Prompt API updated with multimodal capabilities for EPP

The Prompt API with multimodal capabilities is available from Chrome 138
for local experimentation to
[Early Preview Program (EPP) participants](https://developer.chrome.com/docs/ai/join-epp). With this
update, the Prompt API supports audio and images in the input, with a return of
text output.

### Use cases

There are a number of reasons you may consider using multimodal capabilities:

- Allow users to transcribe audio messages sent in a chat application.
- Describe an image uploaded to your website for use in a caption or alt text.

[Your feedback](https://developer.chrome.com/blog/ai-api-updates-io25#share_your_feedback) helps inform the future of this API and
improvements to the model. It may even result in dedicated task APIs (such as
APIs for audio transcription or image description), ensuring we meet your needs
and the needs of your users.

## Proofreader API in EPP

| API | Explainer | Web | Extensions | Chrome Status | Intent |
|---|---|---|---|---|---|
| **Proofreader API** | [GitHub](https://github.com/explainers-by-googlers/proofreader-api) | ![Developer trial](https://developer.chrome.com/static/images/experiment.svg) Developer trial | ![Developer trial](https://developer.chrome.com/static/images/experiment.svg) Developer trial | [View](https://chromestatus.com/feature/5164677291835392) | [Intent to Experiment](https://groups.google.com/a/chromium.org/g/blink-dev/c/Gboyyec4qmg/m/_l6n39OKBAAJ) |

The Proofreader API will be available from Chrome 139 Canary in for local
experimentation [Early Preview Program participants](https://developer.chrome.com/docs/ai/join-epp). With
this API, you can provide interactive proofreading for your users in your web
application or extension.

You will be able to decide what API functions you want to use and design how
the output appears for your users:

- **Correction**: Correct user inputs for grammar, spelling, and punctuation.
- **Labels**: Label each correction by the error type.
- **Explanation**: Defining what the error is or why the correction was necessary in plain language.

We hope to receive your feedback to update how the Proofreader API works, the
quality of the corrections, and general feedback on the API design. The API is
subject to change, based on this feedback.

### Use cases

There are a number of possible use cases for the Proofreader API, including:

- Correct a document the user is editing in their browser.
- Help your customers send grammatically correct chat messages.
- Edit comments on a blog post or forum.
- Provide corrections in note taking applications.

### Demo

## Share your feedback

All of these APIs are in active discussion and subject to change. When you start
experimenting, we want to hear from you.

- [Join the early preview program](https://developer.chrome.com/docs/ai/join-epp) for an early look at new APIs and access to our mailing list.
- Discover all of the [built-in AI APIs](https://developer.chrome.com/docs/ai/built-in-apis), which use foundation and other expert models in the browser.
