const getFolderFromPage = (row, { courseId, courseName }) => {
  return new Promise(resolve => {
    const titleSpan = row.querySelector(".ig-title");
    const iframe = document.createElement("iframe");

    iframe.src = titleSpan.href;
    iframe.onload = () => {
      try {
        const files = Array.from(iframe.contentWindow.document.body.querySelectorAll(".instructure_file_link"));

        resolve({
          name: titleSpan.innerText,
          type: "FOLDER",
          courseName: courseName,
          children: files.filter(file => !!file.innerText).map(file => {
            const endpointParts = file.attributes["data-api-endpoint"].value.split("/");
            return {
              name: file.innerText,
              type: "FILE",
              courseId: courseId,
              fileId: endpointParts[endpointParts.length - 1]
            };
          })
        });
      } catch {
        resolve(null)
      } finally {
        document.body.removeChild(iframe);
      }
    }

    document.body.appendChild(iframe);
  });
}

const getAttachmentFile = async (row, { courseId }) => {
  return {
    name: row.querySelector(".ig-title").innerText,
    type: "FILE",
    courseId: courseId,
    fileId: Array.from(row.parentElement.classList)
      .find(c => c.startsWith("Attachment_"))
      .replace("Attachment_", "")
  }
}

const getChildren = async (row, context) => {
  const type = row.querySelector(".type_icon").title;
  switch (type) {
    case "Page": return await getFolderFromPage(row, context);
    case "Attachment": return await getAttachmentFile(row, context);
    default: return null;
  }
}

const scrapeFolders = async (page) => {
  const courseName = document.querySelector("nav a[href^='/courses']").innerText;
  const courseId = page.location.pathname.split("/")[2];
  const sections = Array.from(page.document.querySelectorAll(".context_module"));

  return await Promise.all(sections.map(async (section, index) => {
    const children = await Promise.all(Array.from(section.querySelectorAll(".ig-row")).map(async row => {
      return await getChildren(row, { courseId, courseName });
    }));

    return {
      name: `${index + 1} - ${section.querySelector(".name").innerText}`,
      type: "FOLDER",
      courseName,
      children
    };
  }));
}

window.addEventListener("message", function(event) {
  if (event.source != window) return;

  if (event.data.type && (event.data.type == "FOUND_MODULE_FOLDERS")) {
    chrome.runtime.sendMessage({ type: event.data.type, folders: event.data.folders });
  }
}, false);

scrapeFolders(window).then(folders => {
  window.postMessage({ type: "FOUND_MODULE_FOLDERS", folders });
});
