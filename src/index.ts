const m3u8Url =
  "http://1257120875.vod2.myqcloud.com/0ef121cdvodtransgzp1257120875/3055695e5285890780828799271/v.f230.m3u8";

console.log("[ m3u8Url ]", m3u8Url);
function add(x: number, y: number): number {
  return x + y;
}

add(1, 2);

const tsUrlList: (string | string[])[] = [];
const finishList: { title: string; status: string; url: string }[] = [];
const rangeDownload = {
  startSegment: 0,
  endSegment: 0,
};

fetch(m3u8Url)
  .then((response) => {
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return response.text(); // 或者使用 response.blob()，取决于响应的类型
  })
  .then((data) => {
    // 处理 `m3u8` 文件的内容
    console.log(data);
    getUrlList(data);
    console.log("[ finishList ]", finishList);
    console.log("[ tsUrlList ]", tsUrlList);

    // 仅获取视频片段数
    rangeDownload.endSegment = finishList.length;

    downloadTS();
  })
  .catch((error) => {
    console.error("Fetch error:", error);
  });

function getUrlList(data: string) {
  // 提取 ts 视频片段地址
  data.split("\n").forEach((item) => {
    if (item && !item.startsWith("#")) {
      console.log(item);
      tsUrlList.push(applyURL(item, m3u8Url));
      finishList.push({
        title: item,
        status: "",
        url: applyURL(item, m3u8Url) as string,
      });
    }
  });
}

// 合成URL
function applyURL(targetURL: string | string[], baseURL: string) {
  baseURL = baseURL || location.href;
  if (targetURL.indexOf("http") === 0) {
    // 当前页面使用 https 协议时，强制使 ts 资源也使用 https 协议获取
    if (location.href.indexOf("https") === 0) {
      return (targetURL as string).replace("http://", "https://");
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

// 下载分片
function downloadTS() {
  // const tips = 'ts 视频碎片下载中，请稍后'
  let downloadIndex = 0;
  const blobs: Blob[] = [];
  let download = () => {
    // let isPause = this.isPause // 使用另一个变量来保持下载前的暂停状态，避免回调后没修改
    let index = downloadIndex;
    if (index >= rangeDownload.endSegment) {
      return;
    }
    downloadIndex++;
    const ts = finishList[index];
    if (ts && ts.status === "") {
      ts.status = "downloading";
      fetch(ts.url)
        .then((res) => res.blob())
        .then((file) => {
          blobs.push(file);
          if (downloadIndex < rangeDownload.endSegment) {
            download();
          } else {
            downloadFile(blobs, "test");
          }
        });
    }
  };

  // 建立多少个 ajax 线程
  for (let i = 0; i < 6; i++) {
    download();
  }
}

// 处理 ts 片段，AES 解密、mp4 转码
function dealTS(_file: any, _index: any, _callback: any) {
  console.log("[ _file, _index, _callback ]", _file, _index, _callback);
  // const;
  // const data = this.aesConf.uri ? this.aesDecrypt(file, index) : file
  // this.conversionMp4(data, index, (afterData) => { // mp4 转码
  //   this.mediaFileList[index - this.rangeDownload.startSegment + 1] = afterData // 判断文件是否需要解密
  //   this.finishList[index].status = 'finish'
  //   this.finishNum++
  //   if (this.streamWriter){
  //     for (let index = this.streamDownloadIndex; index < this.mediaFileList.length; index++) {
  //       if(this.mediaFileList[index]){
  //         this.streamWriter.write(new Uint8Array(this.mediaFileList[index]))
  //         this.mediaFileList[index] = null
  //         this.streamDownloadIndex = index + 1
  //       } else {
  //         break
  //       }
  //     }
  //     if (this.streamDownloadIndex >= this.rangeDownload.targetSegment){
  //       this.streamWriter.close()
  //     }
  //   } else if (this.finishNum === this.rangeDownload.targetSegment) {
  //     let fileName = this.title || this.formatTime(this.beginTime, 'YYYY_MM_DD hh_mm_ss')
  //     if(document.title !== 'm3u8 downloader'){
  //       fileName = this.getDocumentTitle()
  //     }
  //     this.downloadFile(this.mediaFileList, fileName)
  //   }
  //   callback && callback()
  // })
}

// 下载整合后的TS文件
function downloadFile(
  fileDataList: BlobPart[] | undefined,
  fileName: string | undefined
) {
  let a = document.createElement("a");

  const fileBlob = new Blob(fileDataList, { type: "video/MP2T" }); // 创建一个Blob对象，并设置文件的 MIME 类型
  a.download = fileName + ".ts";

  a.href = URL.createObjectURL(fileBlob);
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
