// ==UserScript==
// @name         m3u8下载助手by yxf
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        http://*/*
// @run-at       document-end
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        unsafeWindow
// @require      https://upyun.luckly-mjw.cn/lib/aes-decryptor.js
// ==/UserScript==

(function () {
    "use strict";
    let m3u8Url = "";
    let fileName = "";

    const aesConf = {
      method: "",
      uri: "",
      iv: "",
      key: "",
      decryptor: null,
      stringToBuffer: function (str) {
        return new TextEncoder().encode(str);
      },
    };
  
    const tsUrlList = [];
    const finishList = [];
    const rangeDownload = {
      startSegment: 0,
      endSegment: 0,
    };

    function showDownload(download) {
      let div = document.createElement("div");
      div.className = "m3u8-item";
      div.innerHTML = `
          <span
              class="download-btn"
              style="
                  margin-left: 10px;
                  cursor: pointer;
                  position: fixed;
                  right: 20px;
                  bottom: 50%;
                  font-size: 20px;
                  color: pink;
                  z-index: 999;
          ">⇩</span>
      `;
  
      div.querySelector(".download-btn").addEventListener("click", download);
  
      document.body.appendChild(div);
    }
  
    showDownload(start);
  
    function start() {
      const video = document.querySelector("#m3u8_0");
  
      m3u8Url = video.getAttribute("data-src");
      fileName = document.title || "empty"
  
      fetch(m3u8Url)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.text();
        })
        .then((m3u8Str) => {
          getUrlList(m3u8Str);
          rangeDownload.endSegment = finishList.length;
          if (m3u8Str.indexOf("#EXT-X-KEY") > -1) {
            aesConf.method = (m3u8Str.match(/(.*METHOD=([^,\s]+))/) || [
              "",
              "",
              "",
            ])[2];
            aesConf.uri = (m3u8Str.match(/(.*URI="([^"]+))"/) || ["", "", ""])[2];
            aesConf.iv = (m3u8Str.match(/(.*IV=([^,\s]+))/) || ["", "", ""])[2];
            aesConf.iv = aesConf.iv ? aesConf.stringToBuffer(aesConf.iv) : "";
            aesConf.uri = applyURL(aesConf.uri, m3u8Url);
            getAES();
          } else if (finishList.length > 0) {
            downloadTS();
          }
        })
        .catch((error) => {});
    }
  
    function getUrlList(data) {
      data.split("\n").forEach((item) => {
        if (item && !item.startsWith("#")) {
          tsUrlList.push(applyURL(item, m3u8Url));
          finishList.push({
            title: item,
            status: "",
            url: applyURL(item, m3u8Url),
          });
        }
      });
    }
    function applyURL(targetURL, baseURL) {
      baseURL = baseURL || location.href;
      if (targetURL.indexOf("http") === 0) {
        if (location.href.indexOf("https") === 0) {
          return targetURL.replace("http://", "https://");
        }
        return targetURL;
      } else if (targetURL[0] === "/") {
        let domain = baseURL.split("/");
        return domain[0] + "//" + domain[2] + targetURL;
      } else {
        let domain = baseURL.split("/");
        domain.pop();
        return domain.join("/") + "/" + targetURL;
      }
    }
    function downloadTS() {
      let downloadIndex = 0;
      const blobs = [];
      let download = () => {
        let index = downloadIndex;
        if (index >= rangeDownload.endSegment) {
          return;
        }
        const ts = finishList[index];
        if (ts && ts.status === "") {
          ts.status = "downloading";
          fetch(ts.url)
            .then((res) => res.arrayBuffer())
            .then((file) => {
              if (downloadIndex < rangeDownload.endSegment - 1) {
                const data = aesConf.uri ? aesDecrypt(file, index) : file;
                blobs[downloadIndex] = data;
                downloadIndex++;
                download();
              } else {
                downloadFile(blobs, fileName);
              }
            });
        }
      };
      for (let i = 0; i < 6; i++) {
        download();
      }
    }
    function dealTS(_file, _index, _callback) {}
    function downloadFile(fileDataList, fileName) {
      let a = document.createElement("a");
      const fileBlob = new Blob(fileDataList, { type: "video/MP2T" });
      a.download = fileName + ".ts";
      a.href = URL.createObjectURL(fileBlob);
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
      location.reload();
    }
    function getAES() {
      fetch(aesConf.uri)
        .then((res) => res.arrayBuffer())
        .then((buffer) => {
          try {
            aesConf.key = buffer;
            aesConf.decryptor = new AESDecryptor();
            aesConf.decryptor.constructor();
            aesConf.decryptor.expandKey(aesConf.key);
          } catch (error) {}
          downloadTS();
        })
        .catch((error) => {});
    }
    function aesDecrypt(data, index) {
      let iv =
        aesConf.iv ||
        new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, index]);
      const decryptData = aesConf.decryptor.decrypt(
        data,
        0,
        iv.buffer || iv,
        true
      );
      return decryptData;
    }
  })();
  