const puppeteer = require('puppeteer');
const cheerio = require('cheerio');


async function run() {
  const browser = await puppeteer.launch({headless: false,
  slowMo: 250 // slow down by 250ms
  });
  const page = await browser.newPage();
  await page.goto('https://www.softcom.cz/eshop/herni-konzole-playstation-4_c12286.html');
  await page.screenshot({path: 'buddy-screenshot.png'});

  let content = await page.content();
  var $ = cheerio.load(content);
  
 // console.log(content);
  
  
  
  //$('a.stihref').each(function(i, element){
  
   
   var list = [];
   
   $('a.stihref').each(function (index, element) {
   
	var a = $(this);
   
	var list = a.text();
   
	//list.push($(element).children().attr('name'));
   
	//var  = ($(element).text());
    
	//NEW COMMENT
	/*var a = $(this);
	
	
	var name = a.parent().text();
	var url = a.attr('href');
	var code = a.parent().parent().attr('class');
    //var a = $(this).prev();
   // var rank = a.parent().parent().text();
    //var title = a.text();
    //var url = a.attr('href');
    //var subtext = a.parent().parent().next().children('.subtext').children();
    //var points = $(subtext).eq(0).text();
    //var username = $(subtext).eq(1).text();*/
    //var comments = $(subtext).eq(2).text();

    var metadata = {
      //List: list,
	  Kod: list,
	  //URL: url
	  //rank: parseInt(rank),
      //title: title,
      //url: url,
      //points: parseInt(points),
      //username: username,
      //comments: parseInt(comments)
    };
    console.log(metadata);
  });

  browser.close();
}

run();