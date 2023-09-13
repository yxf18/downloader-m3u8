// @include http://699.su/
import { AESDecryptor } from "./aes-decryptor.js";
const m3u8Url =
  //   "http://1257120875.vod2.myqcloud.com/0ef121cdvodtransgzp1257120875/3055695e5285890780828799271/v.f230.m3u8";
  "https://sf07.yww25.cn/video/2023-09-08/17/1700080863851065344/0bd88d1fa59e4eca8b513114ca351aa9.m3u8";
// "https://sf07.yww25.cn/video/2023-09-11/21/1701229531140468736/6c0a7b583edb45649e8dbdb0a546f276.m3u8";

const aesConf: any = {
  // AES 视频解密配置
  method: "", // 加密算法
  uri: "", // key 所在文件路径
  iv: "", // 偏移值
  key: "", // 秘钥
  decryptor: null, // 解码器对象

  stringToBuffer: function (str: string | undefined) {
    return new TextEncoder().encode(str);
  },
};

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
  .then((m3u8Str) => {
    getUrlList(m3u8Str);
    rangeDownload.endSegment = finishList.length;
    // 检测视频 AES 加密
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
      // 如果视频没加密，则直接下载片段，否则先下载秘钥
      downloadTS();
    }
  })
  .catch((error) => {});

function getUrlList(data: string) {
  // 提取 ts 视频片段地址
  data.split("\n").forEach((item) => {
    if (item && !item.startsWith("#")) {
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

    const ts = finishList[index];
    if (ts && ts.status === "") {
      ts.status = "downloading";
      fetch(ts.url)
        // .then((res) => res.blob())
        .then((res) => res.arrayBuffer())
        .then((file) => {
          //   blobs[downloadIndex] = file;
          //   downloadIndex++;
          if (downloadIndex < rangeDownload.endSegment - 1) {
            // download();
            const data = aesConf.uri ? aesDecrypt(file, index) : file;
            blobs[downloadIndex] = data;
            downloadIndex++;
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

// 获取AES配置
function getAES() {
  fetch(aesConf.uri)
    .then((res) => res.arrayBuffer()) // 将响应数据转换为 ArrayBuffer
    .then((buffer) => {
      try {
        aesConf.key = buffer; // 使用 Uint8Array 包装 ArrayBuffer
        aesConf.decryptor = new AESDecryptor();
        aesConf.decryptor.expandKey(aesConf.key);
      } catch (error) {
      }

      
      downloadTS();
    })
    .catch((error) => {});
}

// ts 片段的 AES 解码
function aesDecrypt(data: ArrayBuffer, index: number) {
  let iv =
    aesConf.iv ||
    new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, index]);
  const decryptData = aesConf.decryptor.decrypt(data, 0, iv.buffer || iv, true);
  return decryptData;
}
