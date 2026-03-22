function insurance_mountain() {
  
  var sheet = SpreadsheetApp.getActiveSheet();
  var sheetName = sheet.getName();

if(sheetName == "טעינת הר הביטוח"){
  var range = sheet.getDataRange();
  var val = range.getValues();

  var insurance_sector = 1;

  var lr = sheet.getLastRow();

  var id = sheet.getRange('B1').getValue()
  
    //חיפוש מבוטח
  var payload ={}

    payload["query"] = "(pcfsystemfield127 = "+id+")";
    payload["fields"] = "*";
    payload["objecttype"] = "2";
    payload["page_size"] = 500;

  var options1 = {
          "method": "post",
          "headers" : {
          "contentType": "application/json",
          "tokenid": tokenID
          },
          "payload": JSON.stringify(payload)
      };
   

    var response = UrlFetchApp.fetch('https://api.powerlink.co.il/api/query', options1)
    Logger.log(response)
    var obj = JSON.parse(response);
    var data = obj.data.Data;
    Logger.log(data)

    if(data.length > 0) { //נמצא מבוטח

    var idInsured = data.map(item => item.contactid);
    var idClient = data.map(item => item.accountid);
    var idLaed = data.map(item => item.pcfsystemfield219);
    Logger.log("מספר מבוטחים: "+data.length);
    Logger.log("ID מבוטח: "+idInsured);
    Logger.log("ID לקוח אב: "+idClient);
    Logger.log("ID ליד: "+idLaed);
    
    for(e = 0; e < idInsured.length; e++){

        //חיפוש הר הביטוח למבוטח
    var payload2 ={}

    payload2["query"] = "(pcfsystemfield139 = "+idInsured[e]+")";
    payload2["fields"] = "*";
    payload2["objecttype"] = "1005";
    payload2["page_size"] = 500;

    var options2 = {
          "method": "post",
          "headers" : {
          "contentType": "application/json",
          "tokenid": tokenID
          },
          "payload": JSON.stringify(payload2)
      };
    Logger.log(payload2);

    var response = UrlFetchApp.fetch('https://api.powerlink.co.il/api/query', options2)
    Logger.log(response)
    var obj = JSON.parse(response);
    var data1 = obj.data.Data;
    Logger.log(data)

    var customobject1005id = data1.map(item => item.customobject1005id);
    Logger.log("מס' יחי' הר הביטוח למחיקה: "+customobject1005id.length);

    if(customobject1005id.length > 0){
      
      for(r = 0; r < customobject1005id.length; r++){
        Logger.log(customobject1005id[r]);
        var options3 = {
        "method": "DELETE",
        "headers" : {
        "contentType": "application/json",
        "tokenid": tokenID
      },
      }
      var url = "https://api.powerlink.co.il/api/record/1005/"+customobject1005id[r];
      UrlFetchApp.fetch(url, options3);
    }
    };
    

    if(data.length > 0){
    for(i = 3; i< lr; i++){
    if(val[i][7] =='' && val[i][0] !=''){
      if(val[i][0] == "תחום - כללי"){
        var insurance_sector = 1;
      };
       if(val[i][0] == "תחום - בריאות ותאונות אישיות"){
        var insurance_sector = 2;
      };
       if(val[i][0] == "תחום - חיים ואבדן כושר עבודה"){
        var insurance_sector = 3;
      }
      Logger.log("i= "+i+", insurance_sector= "+insurance_sector);
    }
    
    if(val[i][7] !=''){ //יצירת הר הביטוח למבוטח

      var results = secondary_branchunction(val[i][1]);
      Logger.log(results);
      var aa = results[0];
      Logger.log(aa);
      Logger.log(typeof(aa));

     if(val[i][4].toString().indexOf("-") !== -1){
      var insurance_period = val[i][4].toString();
      var arry = insurance_period.split(' - ');
      var beginning_insurance_period = arry[0];
      var end_insurance_period = arry[1];
      var beginningArry = beginning_insurance_period.split('/');
      var endArry = end_insurance_period.split('/');
      var beginning = new Date(beginningArry[2],beginningArry[1]-1,beginningArry[0]);
      var end = new Date(endArry[2],endArry[1]-1,endArry[0]);
      Logger.log("beginningArry: "+beginningArry);
      Logger.log("endArry: "+endArry);
      Logger.log("beginning: "+beginning);
      Logger.log("end: "+end);
     }

      var payload3 ={}
  
        payload3["pcfsystemfield139"] = idInsured[e]; //מבוטח👤
        payload3["pcfsystemfield164"] = idClient[0]; //לקוח👤 
        payload3["pcfsystemfield223"] = idLaed[0]; //ליד👤  
        payload3["pcfsystemfield142"] = val[i][0]; //ענף ראשי
        payload3["pcfsystemfield229"] = results[1]; //חוצץ
        payload3["pcfsystemfield228"] = results[0]; //ענף משני
        payload3["pcfsystemfield148"] = val[i][2]; //סוג מוצר
        payload3["pcfsystemfield146"] = val[i][3]; //חברת ביטוח
        if(val[i][4].toString().indexOf("-") !== -1){
        payload3["pcfsystemfield267"] = Utilities.formatDate(beginning,"GMT+2" ,'yyyy-MM-dd\'T\'12:mm:ss.SSS\'Z\''); //תחילת תקופת ביטוח
        payload3["pcfsystemfield269"] = Utilities.formatDate(end,"GMT+2" ,'yyyy-MM-dd\'T\'12:mm:ss.SSS\'Z\''); //סוף תקופת ביטוח 
        };
        payload3["pcfsystemfield156"] = val[i][5]; //פרמיה בש"ח
        payload3["pcfsystemfield154"] = val[i][6]; //סוג פרמיה
        payload3["pcfsystemfield160"] = val[i][7]; //מספר פוליסה
        payload3["pcfsystemfield158"] = val[i][8]; //סיווג תוכנית
        payload3["pcfsystemfield162"] = val[i][9]; //הערות
        payload3["pcfsystemfield227"] = insurance_sector; //תחום בריאות
        payload3["pcfsystemfield281"] = val[i][4].toString();

      var options4 = {
          "method": "post",
          "headers" : {
          "contentType": "application/json",
          "tokenid": tokenID
          },
          "payload": JSON.stringify(payload3)
      };
    
      Logger.log(payload3);
      var response3 =UrlFetchApp.fetch('https://api.powerlink.co.il/api/record/1005', options4);
      Logger.log(response3)

    }
    }
    Logger.log("מס' יחי' הר הביטוח שנרשמו למבוטח זה: "+(lr-3));
  }
  }

  sheet.getRange('B1').clearContent();
  sheet.getRange(4,1,lr,10).clear();

  var options = {
          "method": "post",
          "headers" : {
          "contentType": "application/json",
          }
      };

      var url = "https://hook.eu1.make.com/vo6db7vezx4xdoqzzwgb72ohycr5t3xs?tape=Insured&id="+idInsured;
      UrlFetchApp.fetch(url, options);

    } else {


        //חיפוש ליד
  var payload ={}

    payload["query"] = "(pcfsystemfield101 = "+id+")";
    payload["fields"] = "*";
    payload["objecttype"] = "1003";
    payload["page_size"] = 500;

  var options = {
          "method": "post",
          "headers" : {
          "contentType": "application/json",
          "tokenid": tokenID
          },
          "payload": JSON.stringify(payload)
      };
    Logger.log(payload);

    var response = UrlFetchApp.fetch('https://api.powerlink.co.il/api/query', options)
    Logger.log(response)
    var obj = JSON.parse(response);
    var data = obj.data.Data;
    Logger.log(data)

    if(data.length > 0) { //נמצא ליד

    var idInsured = data.map(item => item.contactid);
    var idClient = data.map(item => item.accountid);
    var idLaed = data.map(item => item.customobject1003id);
    Logger.log("מספר מבוטחים: "+data.length);
    Logger.log("ID ליד: "+idLaed);
    
    for(e = 0; e < idInsured.length; e++){

        //חיפוש הר הביטוח לליד
    var payload ={}

    payload["query"] = "(pcfsystemfield223 = "+idLaed[e]+")";
    payload["fields"] = "*";
    payload["objecttype"] = "1005";
    payload["page_size"] = 500;

    var options = {
          "method": "post",
          "headers" : {
          "contentType": "application/json",
          "tokenid": tokenID
          },
          "payload": JSON.stringify(payload)
      };
//    Logger.log(payload2);

    var response = UrlFetchApp.fetch('https://api.powerlink.co.il/api/query', options)
//    Logger.log(response)
    var obj = JSON.parse(response);
    var data1 = obj.data.Data;
//    Logger.log(data)

    var customobject1005id = data1.map(item => item.customobject1005id);
//    Logger.log("מס' יחי' הר הביטוח למחיקה: "+customobject1005id.length);

    if(customobject1005id.length > 0){
      
      for(r = 0; r < customobject1005id.length; r++){
 //       Logger.log(customobject1005id[r]);
        var options = {
        "method": "DELETE",
        "headers" : {
        "contentType": "application/json",
        "tokenid": tokenID
      },
      }
      var url = "https://api.powerlink.co.il/api/record/1005/"+customobject1005id[r];
      UrlFetchApp.fetch(url, options);
    }
    };

    if(data.length > 0){
    for(i = 3; i< lr; i++){
    if(val[i][7] =='' && val[i][0] !=''){
      if(val[i][0] == "תחום - כללי"){
        var insurance_sector = 1;
      };
       if(val[i][0] == "תחום - בריאות ותאונות אישיות"){
        var insurance_sector = 2;
      };
       if(val[i][0] == "תחום - חיים ואבדן כושר עבודה"){
        var insurance_sector = 3;
      }
 //     Logger.log("i= "+i+", insurance_sector= "+insurance_sector);
    }
    
    if(val[i][7] !=''){

      var results = secondary_branchunction(val[i][1]);
//      Logger.log(results);

      if(val[i][4].toString().indexOf("-") !== -1){
      var insurance_period = val[i][4].toString();
      var arry = insurance_period.split(' - ');
      var beginning_insurance_period = arry[0];
      var end_insurance_period = arry[1];
      var beginningArry = beginning_insurance_period.split('/');
      var endArry = end_insurance_period.split('/');
      var beginning = new Date(beginningArry[2],beginningArry[1]-1,beginningArry[0]);
      var end = new Date(endArry[2],endArry[1]-1,endArry[0]);
      Logger.log("beginningArry: "+beginningArry);
      Logger.log("endArry: "+endArry);
      Logger.log("beginning: "+beginning);
      Logger.log("end: "+end);
     }
      var payload3 ={}
  
        payload3["pcfsystemfield139"] = idInsured[e]; //מבוטח👤
        payload3["pcfsystemfield164"] = idClient[0]; //לקוח👤 
        payload3["pcfsystemfield223"] = idLaed[0]; //ליד👤  
        payload3["pcfsystemfield142"] = val[i][0]; //ענף ראשי
        payload3["pcfsystemfield229"] = results[1]; //חוצץ
        payload3["pcfsystemfield228"] = results[0]; //ענף משני
        payload3["pcfsystemfield148"] = val[i][2]; //סוג מוצר
        payload3["pcfsystemfield146"] = val[i][3]; //חברת ביטוח
        if(val[i][4].toString().indexOf("-") !== -1){
        payload3["pcfsystemfield267"] = Utilities.formatDate(beginning,"GMT+2" ,'yyyy-MM-dd\'T\'12:mm:ss.SSS\'Z\''); //תחילת תקופת ביטוח
        payload3["pcfsystemfield269"] = Utilities.formatDate(end,"GMT+2" ,'yyyy-MM-dd\'T\'12:mm:ss.SSS\'Z\''); //סוף תקופת ביטוח 
        };
        payload3["pcfsystemfield156"] = val[i][5]; //פרמיה בש"ח
        payload3["pcfsystemfield154"] = val[i][6]; //סוג פרמיה
        payload3["pcfsystemfield160"] = val[i][7]; //מספר פוליסה
        payload3["pcfsystemfield158"] = val[i][8]; //סיווג תוכנית
        payload3["pcfsystemfield162"] = val[i][9]; //הערות
        payload3["pcfsystemfield227"] = insurance_sector; //תחום בריאות
        payload3["pcfsystemfield281"] = val[i][4].toString();

      var options = {
          "method": "post",
          "headers" : {
          "contentType": "application/json",
          "tokenid": tokenID
          },
          "payload": JSON.stringify(payload3)
      };
    
//      Logger.log(payload3);
      var response3 =UrlFetchApp.fetch('https://api.powerlink.co.il/api/record/1005', options);
//      Logger.log(response3)

    }
    }
    Logger.log("מס' יחי' הר הביטוח שנרשמו למבוטח זה: "+(lr-3));
  }
  }

  sheet.getRange('B1').clearContent();
  sheet.getRange(4,1,lr,10).clear();
  
  var options = {
          "method": "post",
          "headers" : {
          "contentType": "application/json",
          }
      };

      var url = "https://hook.eu1.make.com/vo6db7vezx4xdoqzzwgb72ohycr5t3xs?tape=lead&id="+idLaed;
      UrlFetchApp.fetch(url, options);

    } else {
      var ui = SpreadsheetApp.getUi();
      ui.alert('נתקלנו בבעיה קטנה⛔','לא נמצא מבוטח או ליד בפאוורלינק ע\"פ מס\' ת.ז. '+id, ui.ButtonSet.OK);
    }
    }
  } else {SpreadsheetApp.getActive().toast('אתה לא נמצא בגיליון הנכון⛔');}
} 