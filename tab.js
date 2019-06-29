// const port = chrome.runtime.connect();

const scrapeFolders = async (page) => {
  const courseName = document.querySelector("nav a[href^='/courses']").innerText;
  const courseId = page.location.pathname.split("/")[2];
  const sections = Array.from(page.document.querySelectorAll(".context_module"))
    .filter(section => section.querySelectorAll(".attachment").length > 0);

  return sections.map((section, index) => {
    const files = Array.from(section.querySelectorAll(".ig-row"))
      .filter(file => file.parentElement.classList.contains("attachment"))
      .map(file => ({
        name: file.querySelector(".ig-title").innerText,
        courseId: courseId,
        fileId: Array.from(file.parentElement.classList)
          .find(c => c.startsWith("Attachment_"))
          .replace("Attachment_", "")
      }))

    return {
      courseName: courseName,
      name: `${index + 1} - ${section.querySelector(".name").innerText}`,
      files: files
    }
  })
}

window.addEventListener("message", function(event) {
  if (event.source != window) return;

  if (event.data.type && (event.data.type == "FOUND_MODULE_FOLDERS")) {
    // port.postMessage(event.data);
    chrome.runtime.sendMessage({ type: event.data.type, folders: event.data.folders });
  }
}, false);

scrapeFolders(window).then(folders => {
  window.postMessage({ type: "FOUND_MODULE_FOLDERS", folders });
});
