var allChildren, attendanceState, checkBoxID;
var crmHeaders = {
    "Accept": "application/json",
    "Content-Type": "application/json; charset=utf-8",
    "OData-MaxVersion": "4.0",
    "Prefer": 'odata.include-annotations="*"',
    "OData-Version": "4.0"
};

// Get All Students
function getChildren() {
    $('#ChaiPaniMeetingAttendees').dataTable().fnClearTable();
    var centerLookUp = window.parent.Xrm.Page.data.entity.attributes.get('new_centername').getValue();   
    if (centerLookUp) {
        var centreId = centerLookUp[0].id.replace('{', '').replace('}', '');
        var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/new_studentmasters?$filter=_owningbusinessunit_value eq " + centreId + " and statuscode eq 1";
        $.ajax({
            url: odataSelect,
            headers: crmHeaders,
            type: 'GET',
            success: function (result) {
                allChildren = result.value;
                getChaiPaniMeetingAttendees();
            }
        });
    }
}

function getChaiPaniMeetingAttendees() {
    var openDayId = window.parent.Xrm.Page.data.entity.getId().replace('{', '').replace('}', '');
    var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/new_chaipanimees?$filter=_new_chaipaniattendmeetingid_value eq " + openDayId;
    $.ajax({
        url: odataSelect,
        headers: crmHeaders,
        type: 'GET',
        success: function (result) {
            var allAttendees = result.value;
            if (allAttendees.length === 0) {
                constructRecordsForAttendance(allChildren, openDayId);
            }
            else if (allAttendees.length === allChildren.length) {
                appendAttendeesToDataTable(allAttendees);
            }
            else if (allAttendees.length > allChildren.length) {
                console.log('Not Same Records Records');
            }
        }
    });
}

function constructRecordsForAttendance(allChildren, openDayId) {
    var requests = [];
    var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/new_chaipanimees";
    for (var child = 0; child < allChildren.length; child++) {
        var openMeetingAttendeeRecord = {
            'new_ChaiPaniAttendMeetingId@odata.bind': '/new_chaipanimeetings(' + openDayId + ')',
            'new_ChaiPaniStudentRegistrationId@odata.bind': '/new_studentmasters(' + allChildren[child].new_studentmasterid + ')',
            'new_studentpresent': false,
            'new_whoattended': 0,
            'new_name': allChildren[child].new_fullname
        };
        requests.push($.ajax({
            url: odataSelect,
            headers: crmHeaders,
            type: 'POST',
            data: window.JSON.stringify(openMeetingAttendeeRecord),
            success: function (result) { }
        }));
    }
    $.when.apply(undefined, requests).then(function (results) {
        getChaiPaniMeetingAttendees()
    });
}

function appendAttendeesToDataTable(allAttendees) {
    for (var i = 0; i < allAttendees.length; i++) {
        var isStudentPresent = '';
        if (allAttendees[i].new_studentpresent) {
            isStudentPresent = 'checked';
        }
        var url = window.parent.Xrm.Page.context.getClientUrl() + "/main.aspx?etn=new_studentmaster&pagetype=entityrecord&id=%7B" + allAttendees[i]._new_studentname_value + "%7D";
        $('#ChaiPaniMeetingAttendees').dataTable().fnAddData([
            '<a href ="' + url + '" target="_blank" style="font-family:Segoe\000020UI,Tahoma,Arial;font-size:small" >' + allAttendees[i]['_new_chaipanistudentregistrationid_value@OData.Community.Display.V1.FormattedValue'] + ' </a>',
            '<span style="font-family:Segoe\000020UI,Tahoma,Arial;font-size : small" >' + allAttendees[i].new_name + '</span>',
            '<span data-toggle="tooltip" title="Student Present"><input type="checkbox" class="BSswitch" name="Morning" data-size="mini" data-on-text="Yes" data-off-text="No" data-on-color="success" data-off-color="danger"  id="student' + allAttendees[i].new_chaipanimeeid + '" ' + isStudentPresent + ' ></span>',
            '<span data-toggle="tooltip" title=""> <select class="centers" id="parents' + allAttendees[i].new_chaipanimeeid + '"><option value="0" >None</option><option value="1">Father</option><option value="2">Mother</option><option value="3">Both</option></select></span>',
        ]);
        document.getElementById("parents" + allAttendees[i].new_chaipanimeeid).selectedIndex = allAttendees[i].new_whoattended;
    }
    initializeSwitch();
}

function initializeSwitch() {
    $('.BSswitch').bootstrapSwitch();
    $("[name='Morning']").bootstrapSwitch();
    $(':checkbox').on('switchChange.bootstrapSwitch', function (event, state) {
        checkBoxID = event.target.id;
        var updateRecord = {
            'id': checkBoxID.replace('student', ''),
            'value': {
                'new_studentpresent': state
            }
        };
        updateRecordInOpenDayAttendee(updateRecord);
    });
    $("select").change(function (event) {
        var parentsRecordID = event.target.id;
        var updateRecord = {
            'id': parentsRecordID.replace('parents', ''),
            'value': {
                'new_whoattended': $(this).val()
            }
        }
        updateRecordInOpenDayAttendee(updateRecord);
    });
}

function updateRecordInOpenDayAttendee(updateRecord) {
    var odataSelect = window.parent.Xrm.Page.context.getClientUrl() + "/api/data/v8.0/new_chaipanimees(" + updateRecord.id + ")";
    $.ajax({
        url: odataSelect,
        headers: crmHeaders,
        type: 'PATCH',
        data: window.JSON.stringify(updateRecord.value),
        success: function (result) { }
    });
}
