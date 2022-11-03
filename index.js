var AipOcrClient = require("baidu-aip-sdk").ocr;
var fs = require("fs");
const vCardsJS = require("vcards-js");
const APP_ID = "28208072";
const API_KEY = "Qmq4aFn1GpK5M5mymBLWEYYk";
const SECRET_KEY = "cPlheIqA160A8qp7e0uov1Peb3ROEm8W";

var client = new AipOcrClient(APP_ID, API_KEY, SECRET_KEY);
let total = 0;
let succ = 0;
const jsonFS = fs.readFileSync("./config.json").toString("utf-8");
const config = JSON.parse(jsonFS);
console.log(config);

function makeVCF(phone) {
  let vCard = vCardsJS();
  // Set contact properties
  vCard.lastName = config.namePrefix;
  vCard.middleName = "";
  vCard.firstName = config.startIndex++;
  vCard.organization = "发展房东";
  vCard.title = "Technical Writer";
  vCard.email = "xxx@example.com";
  vCard.cellPhone = phone;

  // Save contact to VCF file
  vCard.saveToFile(`tmp.vcf`);
  const res = fs.readFileSync(`tmp.vcf`).toString("utf-8");
  fs.rmSync(`tmp.vcf`);
  return res;
}

const failItem = [];
let phoneNumbers = [];
function isPoneAvailable(phone) {
  var myreg = /^[1][3,4,5,7,8][0-9]{9}$/;
  if (!myreg.test(phone)) {
    return false;
  } else {
    return true;
  }
}

// 暴力提取电话号码
function getPhone(str) {
  let n = str.length;
  for (let len = n; len >= 0; len--) {
    for (let st = 0; st + len <= n; st++) {
      let s = str.slice(st, st + len);
      if (isPoneAvailable(s)) {
        return s;
      }
    }
  }
  return "";
}

async function reconizePhoneNumber(image) {
  const res = await client.numbers(image);
  //   console.log("reconizePhoneNumber: ", res);
  const ans = [];
  for (let x of res.words_result) {
    const phone = getPhone(
      x.words
        .split("")
        .filter((v) => v !== " ")
        .join("")
    );
    if (phone) {
      ans.push(phone);
    }
  }
  return ans;
}

async function reconizeHandMadePhoneNumber(image) {
  const res = await client.handwriting(image);
  //   console.log("reconizeHandMadePhoneNumber: ", res);
  const ans = [];
  for (let x of res.words_result) {
    const phone = getPhone(x.words);
    if (phone) {
      ans.push(phone);
    }
  }
  return ans;
}

async function handleImage(str, type) {
  const image = fs.readFileSync(str).toString("base64");
  switch (type) {
    case 1:
      return await reconizePhoneNumber(image);
    case 2:
      return await reconizeHandMadePhoneNumber(image);
  }
}
// const image1 = fs.readFileSync("./1.jpeg").toString("base64");
// reconizePhoneNumber(image1);

// const image2 = fs.readFileSync("./3.jpeg").toString("base64");
// reconizeHandMadePhoneNumber(image2);

// const image3 = fs.readFileSync("./4.jpg").toString("base64");
// reconizePhoneNumber(image3);

// const image4 = fs.readFileSync("./5.jpg").toString("base64");
// reconizePhoneNumber(image4);

(async () => {
  console.log("【开始处理】");
  console.log("------开始处理电子图片-------");
  const normalNames = fs.readdirSync("./normal");
  total += normalNames.length;
  for (let fileName of normalNames) {
    const path = `./normal/${fileName}`;
    let res = await handleImage(path, 1);
    if (res.length) {
      phoneNumbers.push(...res);
      console.log(`[Done] ${path}`);
      succ++;
    } else {
      console.log(`[Fail] ${path}`);
      failItem.push({
        path,
        fileName,
      });
    }
  }
  console.log("------开始处理手写图片-------");
  const handMadeNames = fs.readdirSync("./handMade");
  total += handMadeNames.length;
  for (let fileName of handMadeNames) {
    const path = `./handMade/${fileName}`;
    let res = await handleImage(path, 2);
    if (res.length) {
      phoneNumbers.push(...res);
      console.log(`[Done] ${path}`);
      succ++;
    } else {
      console.log(`[Fail] ${path}`);
      failItem.push({
        path,
        fileName,
      });
    }
  }
  console.log(`---------处理完毕[${succ}/${total}]-------`);
  console.log("处理失败文件保存到fails文件夹中.....");
  for (let x of failItem) {
    fs.copyFileSync(x.path, `./fails/${x.fileName}`);
  }
  phoneNumbers = new Array(...new Set(phoneNumbers));
  console.log("phoneList: ", phoneNumbers);
  console.log(`---------生成vcf文件-------`);
  try {
    fs.rmSync("./output.vcf");
  } catch (e) {}
  for (let phone of phoneNumbers) {
    fs.appendFileSync("./output.vcf", makeVCF(phone));
  }
  console.log(`---------DONE-------`);
})();
