var allStudents;
var businessUnit;
var retrieveReq = new XMLHttpRequest();
var loggedInUserDetails;
var loggedInUser = window.parent.Xrm.Page.context.getUserId();
//Http Calls****************************************************
//Step 1 : Get Active Child Master LIst

function getChildren() {
    if (parent.Xrm.Page.data.entity.getId()) {
        var getId = parent.Xrm.Page.data.entity.getId().replace(/[{}]/g, "");
        //var centername = parent.Xrm.Page.getAttribute("new_centername").getValue()[0].id.replace(/[{}]/g, "");
        var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/new_outingandpicnicattendees?$filter=_new_outingpicnicdetail_value eq " + getId;
        retrieveReq.open("GET", odataSelect, true);
        retrieveReq.setRequestHeader("Accept", "application/json");
        retrieveReq.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        retrieveReq.onreadystatechange = function () {
            if (retrieveReq.readyState == 4 && retrieveReq.status == 200) {
                totalChildren = JSON.parse(this.responseText).value;
                getFilteredChildren(totalChildren, getId);
            }
        };

        retrieveReq.send();
    }
   
}

function getFilteredChildren(existingChildren, getId) {
    var children ="", fetchXml = "";
    var centername = parent.Xrm.Page.getAttribute("new_centername").getValue()[0].id.replace(/[{}]/g, "");
    if (existingChildren.length != 0) {
        for (var i = 0; i < existingChildren.length; i++) {
            var id = existingChildren[i]._new_child_value.replace(/[{}]/g, "");
            children += "<value>" + id + "</value>";
        }
    }
        if (children == "") {
            fetchXml = "<fetch distinct='false' mapping='logical' output-format='xml-platform' version='1.0'> <entity name='new_studentmaster'> <attribute name='new_name'/> <attribute name='createdon'/> <attribute name='new_studentreligion'/> <attribute name='new_studentgender'/> <attribute name='new_mothertoung'/> <attribute name='new_fullname'/> <attribute name='new_isdisability'/> <attribute name='new_dateofenrollment'/> <attribute name='new_birthdate'/> <attribute name='new_studentmasterid'/> <order descending='false' attribute='new_name'/> <filter type='and'><condition attribute='new_ageofchildinyears' operator='gt' value='6'/><condition attribute='new_centername' value='" + centername + "' operator='eq'/><condition attribute='statecode' value='0' operator='eq'/></filter> </entity> </fetch>";
        }
        else {
            fetchXml = "<fetch distinct='false' mapping='logical' output-format='xml-platform' version='1.0'> <entity name='new_studentmaster'> <attribute name='new_name'/> <attribute name='new_fullname'/> <order descending='false' attribute='new_name'/> <filter type='and'> <condition attribute='new_studentmasterid' operator='not-in'>" + children + " </condition> <condition attribute='new_ageofchildinyears' operator='gt' value='6'/> <condition attribute='new_centername' operator='eq' value='" + centername + "'/><condition attribute='statecode' value='0' operator='eq'/> </filter> </entity> </fetch>";
        }
        var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/new_studentmasters?fetchXml=" + fetchXml;
        retrieveReq.open("GET", odataSelect, true);
        retrieveReq.setRequestHeader("Accept", "application/json");
        retrieveReq.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        retrieveReq.onreadystatechange = function () {
            if (retrieveReq.readyState == 4 && retrieveReq.status == 200) {
                generateChildData(JSON.parse(this.responseText).value, getId);
            }
        };

        retrieveReq.send();
    
   }

function generateChildData(childrenData, getId) {
    if (childrenData.length == 0) {
        retrieveAttendanceRecords(getId);
    }
    var childRecord = "";
    for (var data = 0; data < childrenData.length; data++) {
        childRecord = {
            "new_child@odata.bind": "/new_studentmasters(" + childrenData[data].new_studentmasterid + ")",
            "new_outingpicnicdetail@odata.bind": "/new_outingpicnicmasters(" + getId + ")",
            //"new_attendance": false,
            "new_name": childrenData[data].new_fullname
        };
        createAttendaceRecords(childRecord, getId);
    }
}

function createAttendaceRecords(childRecord, getId) {
    if (childRecord != null) {
        var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/new_outingandpicnicattendees";
        retrieveReq.open("POST", odataSelect, false);
        retrieveReq.setRequestHeader("Accept", "application/json");
        retrieveReq.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        retrieveReq.onreadystatechange = function () {
            if (retrieveReq.readyState == 4 && retrieveReq.status == 204) {
                // getDailyAttendanceList(selectedDate);
                retrieveAttendanceRecords(getId);
            }
        };
        retrieveReq.send(window.JSON.stringify(childRecord));
    }
    else {
        retrieveAttendanceRecords(getId);
    }
}


function retrieveAttendanceRecords(Id) {
    var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/new_outingandpicnicattendees?$filter=_new_outingpicnicdetail_value eq " + Id;
    retrieveReq.open("GET", odataSelect, true);
    retrieveReq.setRequestHeader("Accept", "application/json");
    retrieveReq.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    retrieveReq.setRequestHeader("OData-MaxVersion", "4.0");
    retrieveReq.setRequestHeader("OData-Version", "4.0");
    retrieveReq.setRequestHeader("Prefer", "odata.include-annotations=OData.Community.Display.V1.FormattedValue");
    retrieveReq.setRequestHeader("Preference-Applied", "odata.include-annotations='*'");
    retrieveReq.onreadystatechange = function () {
        if (retrieveReq.readyState == 4 && retrieveReq.status == 200) {
            totalChildren = JSON.parse(this.responseText).value;
            getAllChildren(totalChildren);
        }
    };

    retrieveReq.send();
}

function getAllChildren(totalChildren) {
    $('#sampleDatatable').dataTable().fnClearTable();
    for (var i = 0; i < totalChildren.length; i++) {

        //console.log(totalChildren[i]['_new_child_value@OData.Community.Display.V1.FormattedValue']);
        var attendance = '';
        var attendanceStatus = 'A';
        if (totalChildren[i].new_attendance) {
            var attendance = 'checked';
            var attendanceStatus = 'P';
        }
        $('#sampleDatatable').dataTable().fnAddData([
                        '<span>' + (totalChildren[i]['_new_child_value@OData.Community.Display.V1.FormattedValue']) + '</span>',
                      // '<a href ="' + window.parent.Xrm.Page.context.getClientUrl() + '?etn=new_studentmaster&id=%7B' + totalChildren[i]._new_child_value + '%7D&newWindow=true&pagetype=entityrecord" target="_blank" style="font-family:Segoe\000020UI,Tahoma,Arial;font-size:small" >' + (totalChildren[i]['_new_child_value@OData.Community.Display.V1.FormattedValue']) + ' </a>',
                          '<span>' + totalChildren[i].new_name + '</span>',
                          
                        //'<span style="font-family:Segoe\000020UI,Tahoma,Arial;font-size : small" >' + todaysAttenDance[i].new_name + '</span>',
                        '<span><input type="checkbox" name="attendance" data-size="mini" data-on-text="P" data-off-text="A" data-on-color="success" data-off-color="danger"  id="Attendance' + totalChildren[i].new_outingandpicnicattendeeid + '" ' + attendance + '><span style="display:none;" id="' + totalChildren[i].new_outingandpicnicattendeeid + '">' + attendanceStatus + '</span></span>',
                         //'<span><input type="checkbox" name="Morning" data-size="mini" data-on-text="P" data-off-text="A" data-on-color="success" data-off-color="danger"  id="Morning></span>',

        ]);
        initializeSwitch();
    }
}
// Supported Function*************************************************


function initializeSwitch() {
    $('.BSswitch').bootstrapSwitch();
    $("[name='attendance']").bootstrapSwitch();
    $('[data-toggle="tooltip"]').tooltip({ placement: "right" });
    //$('#sampleDatatable tbody').on('click', 'td', function () {
    //    var selectedRow = [];
    //    var tr = $(this).closest("tr");
    //    rowindex = tr.index();
    //    var isPresent = checkBoxID.search('Morning');
    //    selectedRow = $('#sampleDatatable').DataTable().row(rowindex).data();
    //    var dailyAttendanceGuid = checkBoxID.replace('Morning', '');
    //    if (isPresent === -1) {
    //        dailyAttendanceGuid = checkBoxID.replace('Afternoon', '');
    //        if (attendanceState) {
    //            $('#sampleDatatable').DataTable().row(rowindex).data()[4] = selectedRow[4].replace('"A' + dailyAttendanceGuid + '">A', '"A' + dailyAttendanceGuid + '">P');
    //        }
    //        else {
    //            $('#sampleDatatable').DataTable().row(rowindex).data()[4] = selectedRow[4].replace('"A' + dailyAttendanceGuid + '">P', '"A' + dailyAttendanceGuid + '">A');
    //        }
    //        $('#sampleDatatable').DataTable().draw()

    //    }
    //    else {
    //        if (attendanceState) {
    //            $('#sampleDatatable').DataTable().row(rowindex).data()[3] = selectedRow[3].replace('"M' + dailyAttendanceGuid + '">A', '"M' + dailyAttendanceGuid + '">P');
    //        }
    //        else {
    //            $('#sampleDatatable').DataTable().row(rowindex).data()[3] = selectedRow[3].replace('"M' + dailyAttendanceGuid + '">P', '"M' + dailyAttendanceGuid + '">A');
    //        }
    //        // $('#sampleDatatable').DataTable().row(this).data(selectedRow);
    //        $('#sampleDatatable').DataTable().draw()
    //    }
    //    constructRecordToUpdate(dailyAttendanceGuid);
    //    event.stopPropagation();
    //});
    $(':checkbox').on('switchChange.bootstrapSwitch', function (event, state) {
        checkBoxID = event.target.id; // DOM element 
        attendanceState = state;
        updateAttendanceRecord(checkBoxID,state);
    });
}

function updateAttendanceRecord(checkBoxID, state) {
    var guid = checkBoxID.replace('Attendance', '');
    childRecord = {
        "new_attendance": state,
    };
    var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/new_outingandpicnicattendees(" + guid + ")";
    retrieveReq.open("PATCH", odataSelect, false);
   // retrieveReq.open("POST", odataSelect, true);
    retrieveReq.setRequestHeader("Accept", "application/json");
    retrieveReq.setRequestHeader("Content-Type", "application/json; charset=utf-8");
    retrieveReq.onreadystatechange = function () {
        if (retrieveReq.readyState == 4 && retrieveReq.status == 204) {
            // getDailyAttendanceList(selectedDate);
           // retrieveAttendanceRecords(getId);
        }
    };
    retrieveReq.send(window.JSON.stringify(childRecord));
}




