var allStudents, allCenters, centerId;
var updatedRecord = [];
var todayPresentStudents;
var retrieveReq = new XMLHttpRequest();
var attendanceData;
var businessUnits, checkBoxID, attendanceState;

function getDailyAttendanceForSelectedDate(selectedDate) {
    $("#loaderdiv").show();
   // $("#loaderdiv").hide();
    $('#sampleDatatable').dataTable().fnClearTable();
    var selectedCenter = $('#centers').val()
    var selectedClass = $('#classes').val()
    var attendenceDate = getODataUTCDateFilter(selectedDate, 'studentMaster');
    var endDate = attendenceDate.split('T')[0];
    var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/new_dailyattendances?$filter=_new_centername_value eq " + selectedCenter + " and new_studentclass eq " + selectedClass + " and Microsoft.Dynamics.CRM.Between(PropertyName='new_date',";
    odataSelect += 'PropertyValues=["' + attendenceDate + '","' + endDate + 'T23:59:59Z"])';
    retrieveReq.open("GET", odataSelect, true);
    retrieveReq.setRequestHeader("Accept", "application/json");
    retrieveReq.setRequestHeader("Content-Type", "application/json");
    retrieveReq.setRequestHeader("OData-MaxVersion", "4.0");
    retrieveReq.setRequestHeader("Prefer", 'odata.include-annotations="*"');
    retrieveReq.setRequestHeader("OData-Version", "4.0");
    retrieveReq.onreadystatechange = function () {
        if (retrieveReq.readyState == 4 && retrieveReq.status == 200) {
            $("#loaderdiv").css("display", "none");
            //$("#loaderdiv").hide();
            appendDailyAttendanceListToDataTable(selectedDate, this);
            
            
        }
    };
    retrieveReq.send();
}

function getAllCenters() {
    $("#date").val(new Date().toLocaleDateString());
    var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/businessunits";
    retrieveReq.open("GET", odataSelect, true);
    retrieveReq.setRequestHeader("Accept", "application/json");
    retrieveReq.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    retrieveReq.setRequestHeader("OData-MaxVersion", "4.0");
    retrieveReq.setRequestHeader("Prefer", 'odata.include-annotations="*"');
    retrieveReq.setRequestHeader("OData-Version", "4.0");
    retrieveReq.onreadystatechange = function () {
        if (retrieveReq.readyState == 4 && retrieveReq.status == 200) {
            businessUnits = JSON.parse(this.responseText).value;
            for (var businessUnit = 0; businessUnit < businessUnits.length; businessUnit++) {
                var centerOptionSet = document.getElementById("centers");
                var optionSetValues = document.createElement('option');
                optionSetValues.text = businessUnits[businessUnit].name;
                optionSetValues.value = businessUnits[businessUnit].businessunitid;
                centerOptionSet.appendChild(optionSetValues);
            }
            $('#centers').selectpicker({
                size: 6
            });
            //getDailyAttendanceForSelectedDate(new Date())
        }
    };
    retrieveReq.send();
}

function appendDailyAttendanceListToDataTable(selectedDate, attendanceRecord) {
    var todaysAttenDance = this.parent.JSON.parse(attendanceRecord.responseText).value;
    if (todaysAttenDance.length !== 0) {
        $('#sampleDatatable').dataTable().fnClearTable();
        for (var i = 0; i < todaysAttenDance.length; i++) {
            var url = window.parent.Xrm.Page.context.getClientUrl() + "/main.aspx?etn=new_studentmaster&pagetype=entityrecord&id=%7B" + todaysAttenDance[i]._new_studentname_value + "%7D";
            var afternoonPresent = '';
            var tooltipText = '';
            var morningPresent = '';
            var isOnLeave = '';
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
                isOnLeave = 'disabled';
                leave = 'Yes';
            }
            if (todaysAttenDance[i].new_reason) {
                tooltipText = (todaysAttenDance[i].new_reason).toString();
            }
            $('#sampleDatatable').dataTable().fnAddData([
                '<span>' + todaysAttenDance[i].new_date + '</span>',
                '<a href ="' + url + '" target="_blank" style="font-family:Segoe\000020UI,Tahoma,Arial;font-size:small" >' + todaysAttenDance[i]['_new_studentname_value@OData.Community.Display.V1.FormattedValue'] + ' </a>',
                '<span style="font-family:Segoe\000020UI,Tahoma,Arial;font-size : small" >' + todaysAttenDance[i].new_name + '</span>',
                '<span data-toggle="tooltip" title="' + tooltipText + '"><input type="checkbox" class="BSswitch" name="Morning" data-size="mini" data-on-text="P" data-off-text="A" data-on-color="success" data-off-color="danger"  id="Morning' + todaysAttenDance[i].new_dailyattendanceid + '" ' + morningPresent + ' ' + isOnLeave + ' ><span style="display:none;" id="M' + todaysAttenDance[i].new_dailyattendanceid + '">' + morningStatus + '</span></span>',
                '<span data-toggle="tooltip" title="' + tooltipText + '"><input type="checkbox" class="BSswitch" name="Afternoon" data-size="mini" data-on-text="P" data-off-text    ="A" data-on-color="success" data-off-color="danger"  id="Afternoon' + todaysAttenDance[i].new_dailyattendanceid + '" ' + afternoonPresent + ' ' + isOnLeave + ' ><span style="display:none;" id="A' + todaysAttenDance[i].new_dailyattendanceid + '">' + afternoonStatus + '</span></span>',
                '<span style="font-family:Segoe\000020UI,Tahoma,Arial;font-size : small" >' + tooltipText + '</span>',
            ]);
        }
        initializeSwitch();
        //$.LoadingOverlay("hide");
        
    }
}
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
    //$.LoadingOverlay("show");
    var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/new_dailyattendances(" + studentAttendance.dailyAttenDanceGuid + ")";
    retrieveReq.open("PATCH", odataSelect, false);
    retrieveReq.setRequestHeader("Accept", "application/json");
    retrieveReq.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    retrieveReq.onreadystatechange = function () {
        if (retrieveReq.readyState == 4 && retrieveReq.status == 204) {
            //$.LoadingOverlay("hide");
        }
    };
    retrieveReq.send(window.JSON.stringify(studentAttendance.attendance));
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


function getODataUTCDateFilter(date) {
    var monthString;
    var rawMonth = (date.getUTCMonth() + 1).toString();
    if (rawMonth.length == 1) {
        monthString = "0" + rawMonth;
    } else {
        monthString = rawMonth;
    }
    var dateString;
    var rawDate = date.getDate().toString();
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