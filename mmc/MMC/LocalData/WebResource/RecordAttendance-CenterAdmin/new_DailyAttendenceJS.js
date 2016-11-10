var allStudents;
var businessUnit;
var retrieveReq = new XMLHttpRequest();
var loggedInUserDetails;
var loggedInUser = window.parent.Xrm.Page.context.getUserId();
//Http Calls****************************************************
//Step 1 : Get Active Student Master LIst
function getSystemUsers() {
    var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/systemusers?$filter=systemuserid eq " + loggedInUser.replace(/[{}]/g, '');
    retrieveReq.open("GET", odataSelect, true);
    retrieveReq.setRequestHeader("Accept", "application/json");
    retrieveReq.setRequestHeader("Content-Type", "application/json");
    retrieveReq.setRequestHeader("OData-MaxVersion", "4.0");
    retrieveReq.setRequestHeader("Prefer", 'odata.include-annotations="*"');
    retrieveReq.setRequestHeader("OData-Version", "4.0");
    retrieveReq.onreadystatechange = function () {
        if (retrieveReq.readyState == 4 && retrieveReq.status == 200) {
            loggedInUserDetails = JSON.parse(this.responseText).value;
        }
    };
    retrieveReq.send();
}

function getStudentMasterList(selectedDate) {
    var selectedClass = $('#classes').val();
    var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/new_studentmasters?$filter=new_promotionclass eq " + selectedClass + " and statuscode eq 1 and _owningbusinessunit_value eq " + loggedInUserDetails[0]._businessunitid_value;
    retrieveReq.open("GET", odataSelect, true);
    retrieveReq.setRequestHeader("Accept", "application/json");
    retrieveReq.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    retrieveReq.onreadystatechange = function () {
        if (retrieveReq.readyState == 4 && retrieveReq.status == 200) {
            allStudents = JSON.parse(this.responseText).value;
            getDailyAttendence(selectedDate);
            // getDailyAttendenceForSelectedDate(new Date());
        }
    };
    retrieveReq.send();
}
//step 2 : Get Business unit of logged in user

function getCenterName() {
    $("#date").val(new Date().toLocaleDateString());
    var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/businessunits";
    retrieveReq.open("GET", odataSelect, true);
    retrieveReq.setRequestHeader("Accept", "application/json");
    retrieveReq.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    retrieveReq.onreadystatechange = function () {
        if (retrieveReq.readyState == 4 && retrieveReq.status == 200) {
            businessUnit = JSON.parse(this.responseText).value;
            getSystemUsers();
            //  getStudentMasterList();
        }
    };
    retrieveReq.send();
}


//Step3 : Check Exitsing Attendence Records  
function getDailyAttendence(selectedDate) {
    $("#loaderdiv").show();
    var selectedClass = $('#classes').val();
    var attendenceDate = getODataUTCDateFilter(selectedDate);
    var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/new_dailyattendances?$filter=_new_centername_value eq " + businessUnit[0].businessunitid + " and new_studentclass eq " + selectedClass + " and Microsoft.Dynamics.CRM.Between(PropertyName='new_date',";
    odataSelect += 'PropertyValues=["' + attendenceDate + '","' + attendenceDate + 'T23:59:59Z"])';
    retrieveReq.open("GET", odataSelect, true);
    retrieveReq.setRequestHeader("Accept", "application/json");
    retrieveReq.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    retrieveReq.onreadystatechange = function () {
        if (retrieveReq.readyState == 4 && retrieveReq.status == 200) {
            $("#loaderdiv").css("display", "none");
            constructRecordForDailyAttendance(selectedDate, this);
        }
    };
    retrieveReq.send();
}

//Step 3: Create new records in DA for non existing student code
function constructRecordForDailyAttendance(selectedDate, attendanceRecord) {
    var studentRecordDate = getODataUTCDateFilter(selectedDate, 'studentMaster');
    var selectedDateAttendence = this.parent.JSON.parse(attendanceRecord.responseText).value;
    if (selectedDateAttendence.length !== 0) {
        if (selectedDateAttendence.length === allStudents.length) {
            getDailyAttendanceList(selectedDate);
        }
        if (selectedDateAttendence.length > allStudents.length) {
            toastr.success("Duplicate Record found for Students attendance");
        }
        $('#sampleDatatable').dataTable().fnClearTable();
        for (var student = 0; student < allStudents.length; student++) {
            var isPresent = false;
            for (var i = 0; i < selectedDateAttendence.length; i++) {
                if (allStudents[student].new_fullname === selectedDateAttendence[i].new_name) {
                    isPresent = true;
                    break;
                }
            }
            if (isPresent === false) {
                var studentRecord = {
                    "new_Studentname@odata.bind": "/new_studentmasters(" + allStudents[student].new_studentmasterid + ")",
                    'new_name': allStudents[student].new_fullname,
                    'new_date': studentRecordDate,
                    'new_morning': $('#Morning' + student).is(':checked'),
                    'new_afternoon': $('#Afternoon' + student).is(':checked')
                };

                createDailyAttendanceRecords(studentRecord, selectedDate);
            }
        }

    }

    else {
        if (allStudents.length !== 0) {
            for (var student = 0; student < allStudents.length; student++) {
                studentRecord = {
                    "new_Studentname@odata.bind": "/new_studentmasters(" + allStudents[student].new_studentmasterid + ")",
                    'new_name': allStudents[student].new_fullname,
                    'new_date': studentRecordDate,
                    'new_morning': $('#Morning' + student).is(':checked'),
                    'new_afternoon': $('#Afternoon' + student).is(':checked')
                };
                createDailyAttendanceRecords(studentRecord, selectedDate);
            }
        } else {
            alert('No Students record found');
        }
    }
}

function createDailyAttendanceRecords(student, selectedDate) {
    var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/new_dailyattendances";
    retrieveReq.open("POST", odataSelect, false);
    retrieveReq.setRequestHeader("Accept", "application/json");
    retrieveReq.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    retrieveReq.onreadystatechange = function () {
        if (retrieveReq.readyState == 4 && retrieveReq.status == 204) {
            getDailyAttendanceList(selectedDate);
        }
    };
    retrieveReq.send(window.JSON.stringify(student));
}

//Step 4: Get Records list from DA for selected date and append to data table

function getDailyAttendanceList(selectedDate) {
    $("#loaderdiv").show();
    var selectedClass = $('#classes').val();
    var attendenceDate = getODataUTCDateFilter(selectedDate, 'studentMaster');
    var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/new_dailyattendances?$filter=_new_centername_value eq " + businessUnit[0].businessunitid + " and new_studentclass eq " + selectedClass + " and Microsoft.Dynamics.CRM.Between(PropertyName='new_date',";
    odataSelect += 'PropertyValues=["' + attendenceDate + '","' + attendenceDate + 'T23:59:59Z"])';
    retrieveReq.open("GET", odataSelect, true);
    retrieveReq.setRequestHeader("Accept", "application/json");
    retrieveReq.setRequestHeader("Content-Type", "application/json");
    retrieveReq.setRequestHeader("OData-MaxVersion", "4.0");
    retrieveReq.setRequestHeader("Prefer", 'odata.include-annotations="*"');
    retrieveReq.setRequestHeader("OData-Version", "4.0");
    retrieveReq.onreadystatechange = function () {
        if (retrieveReq.readyState == 4 && retrieveReq.status == 200) {
            $("#loaderdiv").css("display", "none");
            appendDailyAttendanceListToDataTable(selectedDate, this);
        }
    };
    retrieveReq.send();
}

function appendDailyAttendanceListToDataTable(selectedDate, attendanceRecord) {
    var activeSwitch = '';
    var tooltipText = '';
    var leaveReason = '';
    var todaysAttenDance = this.parent.JSON.parse(attendanceRecord.responseText).value;
    if (todaysAttenDance.length !== 0) {
        $('#sampleDatatable').dataTable().fnClearTable();
        if (simulateDate(selectedDate, new Date())) {
            activeSwitch = 'disabled';
            tooltipText = 'You cannot update previous date attendance.';
        }
        for (var i = 0; i < todaysAttenDance.length; i++) {
            var url = window.parent.Xrm.Page.context.getClientUrl() + "/main.aspx?etn=new_studentmaster&pagetype=entityrecord&id=%7B" + todaysAttenDance[i]._new_studentname_value + "%7D";
            var afternoonPresent = '';
            var morningPresent = '';
            var leave = 'No';
            var morningStatus = 'A', afternoonStatus = 'A';
            if (todaysAttenDance[i].new_afternoon) {
                afternoonPresent = 'checked';
                afternoonStatus = 'P';
            }
            if (todaysAttenDance[i].new_morning) {
                morningPresent = 'checked';
                morningStatus = 'P';
            }
            if (todaysAttenDance[i].new_isstudentonleave) {
                activeSwitch = 'disabled';
                leave = 'Yes';
            }
            if (todaysAttenDance[i].new_reason) {
                leaveReason = (todaysAttenDance[i].new_reason).toString();
            }
            $('#sampleDatatable').dataTable().fnAddData([
                '<span>' + todaysAttenDance[i].new_date + '</span>',
                '<a href ="' + url + '" target="_blank" style="font-family:Segoe\000020UI,Tahoma,Arial;font-size:small" >' + todaysAttenDance[i]['_new_studentname_value@OData.Community.Display.V1.FormattedValue'] + ' </a>',
                '<span style="font-family:Segoe\000020UI,Tahoma,Arial;font-size : small" >' + todaysAttenDance[i].new_name + '</span>',
                '<span data-toggle="tooltip" title="' + tooltipText + '"><input type="checkbox" name="Morning" data-size="mini" data-on-text="P" data-off-text="A" data-on-color="success" data-off-color="danger"  id="Morning' + todaysAttenDance[i].new_dailyattendanceid + '" ' + morningPresent + ' ' + activeSwitch + '><span style="display:none;" id="M' + todaysAttenDance[i].new_dailyattendanceid + '">' + morningStatus + '</span></span>',
                '<span  data-toggle="tooltip" title="' + tooltipText + '"><input type="checkbox" name="Afternoon" data-size="mini" data-on-text="P" data-off-text    ="A" data-on-color="success" data-off-color="danger"  id="Afternoon' + todaysAttenDance[i].new_dailyattendanceid + '" ' + afternoonPresent + ' ' + activeSwitch + ' ><span style="display:none;" id="A' + todaysAttenDance[i].new_dailyattendanceid + '">' + afternoonStatus + '</span></span>',
                '<span style="font-family:Segoe\000020UI,Tahoma,Arial;font-size : small" >' + leaveReason + '</span>',
            ]);
            initializeSwitch();
        }
    }
}

//Step 5 : Update Daily Attendance Record

function constructRecordToUpdate(dailyAttenDanceGuid) {
    var todayAttendance = {
        'dailyAttenDanceGuid': dailyAttenDanceGuid,
        'attendance': {
            'new_morning': $('#Morning' + dailyAttenDanceGuid).is(':checked'),
            'new_afternoon': $('#Afternoon' + dailyAttenDanceGuid).is(':checked')
        }
    };
    updateDailyAttendanceRecords(todayAttendance);
}

function updateDailyAttendanceRecords(studentAttendance) {
    var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/new_dailyattendances(" + studentAttendance.dailyAttenDanceGuid + ")";
    retrieveReq.open("PATCH", odataSelect, false);
    retrieveReq.setRequestHeader("Accept", "application/json");
    retrieveReq.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    retrieveReq.onreadystatechange = function () {
        if (retrieveReq.readyState == 4 && retrieveReq.status == 204) {
        }
    };
    retrieveReq.send(window.JSON.stringify(studentAttendance.attendance));
}

// Supported Function*************************************************

function getODataUTCDateFilter(date) {
    var dateFilter;
    var year = date.getFullYear().toString();
    var month = date.getMonth() + 1;
    var currentDate = date.getDate();

    var monthString = month.toString();
    var dateString = currentDate.toString();

    if (monthString.length === 1) {
        monthString = "0" + monthString;
    }
    if (dateString.length === 1) {
        dateString = '0' + dateString;
    }
    dateFilter = year + "-" + monthString + "-" + dateString;
    return dateFilter;
}

function simulateDate(oldDate, currentDate) {
    var selectedDate = parseInt((getODataUTCDateFilter(oldDate)).replace(/-/g, ""));
    var currDate = parseInt((getODataUTCDateFilter(currentDate)).replace(/-/g, ""));
    if (selectedDate < currDate) {
        return true;
    }
    else {
        return false;
    }
}

function initializeSwitch() {
    $('.BSswitch').bootstrapSwitch();
    $("[name='Morning']").bootstrapSwitch();
    $("[name='Afternoon']").bootstrapSwitch();
    $('[data-toggle="tooltip"]').tooltip({ placement: "right" });
    $('#sampleDatatable tbody').on('click', 'td', function () {
        var selectedRow = [];
        var tr = $(this).closest("tr");
        rowindex = tr.index();
        var isPresent = checkBoxID.search('Morning');
        selectedRow = $('#sampleDatatable').DataTable().row(rowindex).data();
        var dailyAttendanceGuid = checkBoxID.replace('Morning', '');
        if (isPresent === -1) {
            dailyAttendanceGuid = checkBoxID.replace('Afternoon', '');
            if (attendanceState) {
                $('#sampleDatatable').DataTable().row(rowindex).data()[4] = selectedRow[4].replace('"A' + dailyAttendanceGuid + '">A', '"A' + dailyAttendanceGuid + '">P');
            }
            else {
                $('#sampleDatatable').DataTable().row(rowindex).data()[4] = selectedRow[4].replace('"A' + dailyAttendanceGuid + '">P', '"A' + dailyAttendanceGuid + '">A');
            }
            $('#sampleDatatable').DataTable().draw()

        }
        else {
            if (attendanceState) {
                $('#sampleDatatable').DataTable().row(rowindex).data()[3] = selectedRow[3].replace('"M' + dailyAttendanceGuid + '">A', '"M' + dailyAttendanceGuid + '">P');
            }
            else {
                $('#sampleDatatable').DataTable().row(rowindex).data()[3] = selectedRow[3].replace('"M' + dailyAttendanceGuid + '">P', '"M' + dailyAttendanceGuid + '">A');
            }
            // $('#sampleDatatable').DataTable().row(this).data(selectedRow);
            $('#sampleDatatable').DataTable().draw()
        }
        constructRecordToUpdate(dailyAttendanceGuid);
        event.stopPropagation();
    });
    $(':checkbox').on('switchChange.bootstrapSwitch', function (event, state) {
        checkBoxID = event.target.id; // DOM element 
        attendanceState = state;
    });
}
