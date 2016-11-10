var allStudents;
var retrieveReq = new XMLHttpRequest();

//Step 1: Get all active students
function getActiveStudents() {
    var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/new_studentmasters?$filter=statuscode eq 1";
    retrieveReq.open("GET", odataSelect, false);
    retrieveReq.setRequestHeader("Accept", "application/json");
    retrieveReq.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    retrieveReq.onreadystatechange = function () {
        allStudents = JSON.parse(this.response).value;
    };
    retrieveReq.send();
}

// Step 2: Get Attendance records for today
function getDailyAttendenceForSelectedDate(selectedDate) {
    toastr.info('Generating Attendance.....');
    $.LoadingOverlay("show");
    var attendenceDate = getODataUTCDateFilter(selectedDate, 'DailyAttendance');
    var endDate = attendenceDate.split('T')[0];
    var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/new_dailyattendances?$filter=Microsoft.Dynamics.CRM.Between(PropertyName='new_date',";
    odataSelect += 'PropertyValues=["' + attendenceDate + '","' + endDate + 'T23:59:59Z"])';
    retrieveReq.open("GET", odataSelect, true);
    retrieveReq.setRequestHeader("Accept", "application/json");
    retrieveReq.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    retrieveReq.onreadystatechange = function () {
        if (retrieveReq.readyState == 4 && retrieveReq.status == 200) {
            constructRecordForDailyAttendance(selectedDate, this);
        }
    };
    retrieveReq.send();
}

//Step 3: Create new records in DA for non existing student code
function constructRecordForDailyAttendance(selectedDate, attendanceRecord) {

    var studentRecordDate;
    var selectedDateAttendence = this.parent.JSON.parse(attendanceRecord.responseText).value;
    if (selectedDateAttendence.length != 0) {
        if (selectedDateAttendence.length === allStudents.length) {
            //getDailyAttendanceList(new Date());
            toastr.info("Attendance Already generated for today!!!");
            $.LoadingOverlay("hide");
        }
        studentRecordDate = getODataUTCDateFilter(new Date(), 'studentMaster');

        for (student = 0; student < allStudents.length; student++) {
            var isPresent = false;
            for (var i = 0; i < selectedDateAttendence.length; i++) {
                if (allStudents[student].new_fullname === selectedDateAttendence[i].new_name) {
                    isPresent = true;
                    break;
                }
            }
            if (isPresent == false) {
                var studentRecord = {
                    "new_Studentname@odata.bind": "/new_studentmasters(" + allStudents[student].new_studentmasterid + ")",
                    'new_name': allStudents[student].new_fullname,
                    'new_date': studentRecordDate,
                    'new_morning': $('#Morning' + student).is(':checked'),
                    'new_afternoon': $('#Afternoon' + student).is(':checked')
                }
                createDailyAttendanceRecords(studentRecord);
            }
        }
        if (student == allStudents.length) {
            toastr.info('Attendance generated successfully!');
            $.LoadingOverlay("hide");
            window.open(window.parent.Xrm.Page.context.getClientUrl() + "/main.aspx?etn=new_dailyattendance&pagetype=entitylist&viewid=E05204A6-5F10-E611-80F8-3863BB2EFDC0#775858543");
        }
    }
    else {
        studentRecordDate = getODataUTCDateFilter(new Date(), 'studentMaster');
        var student = 0;
        if (allStudents.length != 0) {
            for (student = 0; student < allStudents.length; student++) {
                var studentRecord = {
                    "new_Studentname@odata.bind": "/new_studentmasters(" + allStudents[student].new_studentmasterid + ")",
                    'new_name': allStudents[student].new_fullname,
                    'new_date': studentRecordDate,
                    'new_morning': $('#Morning' + student).is(':checked'),
                    'new_afternoon': $('#Afternoon' + student).is(':checked')
                }
                createDailyAttendanceRecords(studentRecord);
            }
            if (student == allStudents.length) {
                $.LoadingOverlay("hide");
                window.open(window.parent.Xrm.Page.context.getClientUrl() + "/main.aspx?etn=new_dailyattendance&pagetype=entitylist&viewid=E05204A6-5F10-E611-80F8-3863BB2EFDC0#775858543");
            }
        } else {
            alert('No Students record found')
        }
    }
}

function createDailyAttendanceRecords(student) {

    var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/new_dailyattendances";
    retrieveReq.open("POST", odataSelect, false);
    retrieveReq.setRequestHeader("Accept", "application/json");
    retrieveReq.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    retrieveReq.onreadystatechange = function () {
        if (retrieveReq.readyState == 4 && retrieveReq.status == 204) {


        }
    };

    retrieveReq.send(window.JSON.stringify(student));

}

function getODataUTCDateFilter(date) {
    var monthString;
    var rawMonth = (date.getUTCMonth() + 1).toString();
    var dateString;
    var rawDate = date.getDate().toString();
    if (rawMonth.length == 1) {
        monthString = "0" + rawMonth;
    } else {
        monthString = rawMonth;
    }
    if (date.getDate() == 1) {
        rawMonth = (date.getUTCMonth() + 2).toString();
        monthString = rawMonth;
    }
    if (rawDate.length == 1) {
        dateString = "0" + rawDate;
    } else {
        dateString = rawDate;
    }
    var DateFilter = '';
    DateFilter += date.getUTCFullYear() + "-";
    DateFilter += monthString + "-";
    DateFilter += dateString;
    return DateFilter;
}
//var dateRange,selectedDays;

// function getDateRange(selectedDate, selectedDateObject) {
//     if (selectedDateObject.length === 2) {
//         dateRange = selectedDateObject;
//         selectedDays = getDates(dateRange[0], dateRange[1]);
//     }
//     else if(selectedDateObject.length ===1){
//        selectedDays =  selectedDateObject;
//     }
// }

// Date.prototype.addDays = function(days) {
//     var dat = new Date(this.valueOf())
//     dat.setDate(dat.getDate() + days);
//     return dat;
// }

// function getDates(startDate, stopDate) {
//     var dateArray = new Array();
//     var currentDate = startDate;
//     while (currentDate <= stopDate) {
//         dateArray.push(currentDate);
//         currentDate = currentDate.addDays(1);
//     }
//     return dateArray;
// }

// function getStudentsRecord() {
// $.LoadingOverlay("show");
// var student = 0;
//     if (allStudents.length != 0) {  
//         for (student = 0; student < allStudents.length; student++) {
//             for (var date = 0; date < selectedDays.length; date++) {
//                 var studentRecordDate = getODataUTCDateFilter((selectedDays[date]),'studentMaster');
//                 var studentRecord = {
//                     "new_Studentname@odata.bind": "/new_studentmasters(" + allStudents[student].new_studentmasterid + ")",
//                     'new_name': allStudents[student].new_fullname,
//                     'new_date': studentRecordDate,
//                     'new_morning': $('#Morning' + student).is(':checked'),
//                     'new_afternoon': $('#Afternoon' + student).is(':checked')
//                 }
//                   createDailyAttendanceRecords(studentRecord);
//             }
//         }
// if(student==allStudents.length){
// $.LoadingOverlay("hide");
// }
//     } else {
//         alert('No Students record found')
//     }

// }

// function getStudentsRecord() {
//     $.LoadingOverlay("show");
//     var studentRecordDate = getODataUTCDateFilter(new Date(), 'studentMaster');
//     var student = 0;
//     if (allStudents.length != 0) {
//         for (student = 0; student < allStudents.length; student++) {

//             var studentRecord = {
//                 "new_Studentname@odata.bind": "/new_studentmasters(" + allStudents[student].new_studentmasterid + ")",
//                 'new_name': allStudents[student].new_fullname,
//                 'new_date': studentRecordDate,
//                 'new_morning': $('#Morning' + student).is(':checked'),
//                 'new_afternoon': $('#Afternoon' + student).is(':checked')
//             }
//             createDailyAttendanceRecords(studentRecord);
//         }
//         if (student == allStudents.length) {
//             $.LoadingOverlay("hide");
//            window.open("https://eternusrnd.crm5.dynamics.com/main.aspx?etn=new_dailyattendance&pagetype=entitylist&viewid=E05204A6-5F10-E611-80F8-3863BB2EFDC0#775858543");
//        }
//     } else {
//         alert('No Students record found')
//     }
// }

