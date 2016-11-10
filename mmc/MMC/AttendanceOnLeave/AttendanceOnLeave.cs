using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using Microsoft.Xrm.Sdk.Client;
using System.ServiceModel;
using Microsoft.Crm.Sdk.Messages;

namespace AttendanceOnLeave
{
    public class AttendanceOnLeave : IPlugin
    {
        private IOrganizationService _service;
        private IOrganizationServiceFactory serviceFactory;
        private IPluginExecutionContext context;
        private string reason = string.Empty;
        private DateTime startDate, endDate;
        private List<DateTime> newDates = new List<DateTime>();
        public void Execute(IServiceProvider serviceProvider)
        {
            context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
            serviceFactory = (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));
            _service = serviceFactory.CreateOrganizationService(context.UserId);

            try
            {
                if (context.MessageName == "Create")
                {
                    if (context.InputParameters.Contains("Target") && context.InputParameters["Target"] is Entity)
                    {
                        onCreate();
                    }
                }
                else if (context.MessageName == "Update")
                {

                    if (context.InputParameters.Contains("Target") && context.InputParameters["Target"] is Entity)
                    {
                        onUpdate();
                    }

                }
                else if (context.MessageName == "Delete")
                {

                    if (context.InputParameters.Contains("Target") && context.InputParameters["Target"] is EntityReference)
                    {
                        onDelete();
                    }

                }
            }
            catch (Exception ex)
            {
                throw new InvalidPluginExecutionException(ex.ToString());
            }
        }

        public void onCreate()
        {
            Entity entity = context.InputParameters["Target"] as Entity;
            if (entity.Contains("new_startdate") && entity.Contains("new_enddate"))
            {
                startDate = Convert.ToDateTime(entity.Attributes["new_startdate"]);
                endDate = Convert.ToDateTime(entity.Attributes["new_enddate"]);

                if (entity.Contains("new_reason"))
                {
                    reason = Convert.ToString(entity.Attributes["new_reason"]);
                }

                var studentId = ((Microsoft.Xrm.Sdk.EntityReference)entity.Attributes["new_studentcode"]).Id;
                var studentMasterName = ((Microsoft.Xrm.Sdk.EntityReference)entity.Attributes["new_studentcode"]).LogicalName;
                var totalDays = (endDate - startDate).TotalDays;

                for (int day = 0; day < totalDays + 1; day++)
                {
                    DateTime tempStartDate = startDate.AddDays(day);
                    string record = @"<fetch distinct='false' mapping='logical' output-format='xml-platform' version='1.0'>
                                      <entity name='new_dailyattendance'>
                                      <attribute name='new_dailyattendanceid'/>
                                      <attribute name='new_name'/>
                                      <attribute name='new_isstudentonleave'/>
                                      <attribute name='new_morning'/>
                                      <attribute name='new_afternoon'/>
                                      <order descending='false' attribute='new_name'/>
                                      <filter type='and'><filter type='and'>
<condition attribute='new_studentname' value='" + studentId + "' uitype='new_studentmaster' operator='eq'/><condition attribute='new_date' value='" + (tempStartDate.Year + "/" + tempStartDate.Month + "/" + tempStartDate.Day) + "' operator='eq'/></filter></filter> </entity></fetch>";
                    EntityCollection result = _service.RetrieveMultiple(new FetchExpression(record));
                    if (result.Entities.Count > 0)
                    {
                        foreach (Entity data in result.Entities)
                        {
                            data.Attributes["new_isstudentonleave"] = true;
                            data.Attributes["new_reason"] = reason;
                            _service.Update(data);

                        }
                    }
                    else
                    {
                        Entity attendance = new Entity("new_dailyattendance");
                        attendance.Attributes["new_studentname"] = new EntityReference(studentMasterName, studentId);
                        attendance.Attributes["new_isstudentonleave"] = true;
                        attendance.Attributes["new_date"] = startDate.AddDays(day);
                        attendance.Attributes["new_reason"] = reason;
                        _service.Create(attendance);
                    }
                }


            }
        }

        public void onUpdate()
        {
            Entity entity = context.InputParameters["Target"] as Entity;

            Entity previousData = context.PreEntityImages["PreviousData"];
            DateTime oldStartDate = Convert.ToDateTime(previousData["new_startdate"]);

            DateTime oldEndDate = Convert.ToDateTime(previousData["new_enddate"]);
            if (entity.Contains("new_startdate"))
            {
                startDate = Convert.ToDateTime(entity.Attributes["new_startdate"]);
            }
            else
            {
                startDate = oldStartDate;
            }
            if (entity.Contains("new_enddate"))
            {
                endDate = Convert.ToDateTime(entity.Attributes["new_enddate"]);
            }
            else
            {
                endDate = oldEndDate;
            }

            if (entity.Contains("new_reason"))
            {
                reason = Convert.ToString(entity.Attributes["new_reason"]);
            }
            else if (previousData.Contains("new_reason"))
            {
                reason = Convert.ToString(previousData["new_reason"]);
            }
            string studentId = ((Microsoft.Xrm.Sdk.EntityReference)previousData.Attributes["new_studentcode"]).Id.ToString();
            string studentMasterName = ((Microsoft.Xrm.Sdk.EntityReference)previousData.Attributes["new_studentcode"]).LogicalName.ToString();
            int totalDays = Convert.ToInt32((endDate - startDate).TotalDays);
            var totalOldDays = (oldEndDate - oldStartDate).TotalDays;
            var oldDates = new List<DateTime>();
            for (int day = 0; day < totalOldDays + 1; day++)
            {
                oldDates.Add(oldStartDate.AddDays(day));
            }

            for (int day = 0; day < totalDays + 1; day++)
            {
                newDates.Add(startDate.AddDays(day));
            }
            ////Case 1///////////////////////
            if (startDate <= oldStartDate && endDate >= oldEndDate)
            {
                updateDailyAttendanceCase1(totalDays, studentId, studentMasterName);
            }

            ///Case 2/////////////////////////////////////

            else if (startDate >= oldStartDate && endDate <= oldEndDate)
            {
                updateDailyAttendanceCase2(totalDays, studentId, studentMasterName, oldStartDate, oldEndDate);
            }
            ///////Case 3//////////////                            
            else if (startDate >= oldEndDate)
            {
                updateDailyAttendanceCase3(totalDays, studentId, studentMasterName, oldStartDate, oldEndDate);
            }
            ///////////Case 4/////////////
            else if (endDate <= oldStartDate)
            {
                updateDailyAttendanceCase4(totalDays, studentId, studentMasterName, oldStartDate, oldEndDate);
            }
        }

        public void updateDailyAttendanceCase1(int totalDays, string studentId, string studentMasterName)
        {
            for (int day = 0; day < totalDays + 1; day++)
            {
                DateTime tempStartDate = startDate.AddDays(day);
                string record = @"<fetch distinct='false' mapping='logical' output-format='xml-platform' version='1.0'>
                                      <entity name='new_dailyattendance'>
                                      <attribute name='new_dailyattendanceid'/>
                                      <attribute name='new_name'/>
                                      <attribute name='new_isstudentonleave'/>
                                      <attribute name='new_morning'/>
                                      <attribute name='new_afternoon'/>
                                      <order descending='false' attribute='new_name'/>
                                      <filter type='and'><filter type='and'>
<condition attribute='new_studentname' value='" + studentId + "' uitype='new_studentmaster' operator='eq'/><condition attribute='new_date' value='" + (tempStartDate.Year + "/" + tempStartDate.Month + "/" + tempStartDate.Day) + "' operator='eq'/></filter></filter> </entity></fetch>";
                EntityCollection result = _service.RetrieveMultiple(new FetchExpression(record));
                if (result.Entities.Count > 0)
                {
                    foreach (Entity data in result.Entities)
                    {
                        data.Attributes["new_isstudentonleave"] = true;
                        data.Attributes["new_reason"] = reason;
                        _service.Update(data);
                    }
                }
                else
                {
                    Entity attendance = new Entity("new_dailyattendance");
                    attendance.Attributes["new_studentname"] = new EntityReference(studentMasterName, new Guid(studentId));
                    attendance.Attributes["new_isstudentonleave"] = true;
                    attendance.Attributes["new_date"] = startDate.AddDays(day);
                    attendance.Attributes["new_reason"] = reason;
                    _service.Create(attendance);
                }
            }
        }

        public void updateDailyAttendanceCase2(int totalDays, string studentId, string studentMasterName, DateTime oldStartDate, DateTime oldEndDate)
        {
            string record = @"<fetch distinct='false' mapping='logical' output-format='xml-platform' version='1.0'>
                                      <entity name='new_dailyattendance'>
                                      <attribute name='new_dailyattendanceid'/>
                                      <attribute name='new_name'/>
                                      <attribute name='new_isstudentonleave'/>
                                      <attribute name='new_morning'/>
                                      <attribute name='new_afternoon'/>
                                       <attribute name='new_date'/>
                                      <order descending='false' attribute='new_name'/>
                                      <filter type='and'><filter type='and'>
<condition attribute='new_studentname' value='" + studentId + "' uitype='new_studentmaster' operator='eq'/><condition attribute='new_date' value='" + (oldStartDate.Year + "/" + oldStartDate.Month + "/" + oldStartDate.Day) + "' operator='on-or-after'/><condition attribute='new_date' value='" + (oldEndDate.Year + "/" + oldEndDate.Month + "/" + oldEndDate.Day) + "' operator='on-or-before'/></filter></filter> </entity></fetch>";
            EntityCollection result = _service.RetrieveMultiple(new FetchExpression(record));
            if (result.Entities.Count > 0)
            {

                foreach (Entity data in result.Entities)
                {
                    foreach (DateTime eachday in newDates)
                    {
                        if (Convert.ToDateTime(data.Attributes["new_date"]) == eachday)
                        {
                            data.Attributes["new_isstudentonleave"] = true;
                            data.Attributes["new_reason"] = reason;
                            break;
                        }
                        else
                        {
                            data.Attributes["new_isstudentonleave"] = false;
                            data.Attributes["new_reason"] = string.Empty;
                        }

                    }

                    _service.Update(data);

                }
            }
            //In case one record does not exist already
            for (int day = 0; day < totalDays + 1; day++)
            {
                DateTime tempStartDate = startDate.AddDays(day);
                string getAttendanceRecords = @"<fetch distinct='false' mapping='logical' output-format='xml-platform' version='1.0'>
                                      <entity name='new_dailyattendance'>
                                      <attribute name='new_dailyattendanceid'/>
                                      <attribute name='new_name'/>
                                      <attribute name='new_isstudentonleave'/>
                                      <attribute name='new_morning'/>
                                      <attribute name='new_afternoon'/>
                                       <attribute name='new_date'/>
                                      <order descending='false' attribute='new_name'/>
                                      <filter type='and'>
<condition attribute='new_studentname' value='" + studentId + "' uitype='new_studentmaster' operator='eq'/><condition attribute='new_date' value='" + (tempStartDate.Year + "-" + tempStartDate.Month + "-" + tempStartDate.Day) + "' operator='on'/></filter> </entity></fetch>";
                EntityCollection records = _service.RetrieveMultiple(new FetchExpression(record));
                if (result.Entities.Count > 0)
                {

                }
                else
                {
                    Entity attendance = new Entity("new_dailyattendance");
                    attendance.Attributes["new_studentname"] = new EntityReference(studentMasterName, new Guid(studentId));
                    attendance.Attributes["new_isstudentonleave"] = true;
                    attendance.Attributes["new_date"] = startDate.AddDays(day);
                    attendance.Attributes["new_reason"] = reason;
                    _service.Create(attendance);
                }
                //}
            }
        }

        public void updateDailyAttendanceCase3(int totalDays, string studentId, string studentMasterName, DateTime oldStartDate, DateTime oldEndDate)
        {
            string record = @"<fetch distinct='false' mapping='logical' output-format='xml-platform' version='1.0'>
                                      <entity name='new_dailyattendance'>
                                      <attribute name='new_dailyattendanceid'/>
                                      <attribute name='new_name'/>
                                      <attribute name='new_date'/>
                                      <attribute name='new_isstudentonleave'/>
                                      <attribute name='new_morning'/>
                                      <attribute name='new_afternoon'/>
                                      <order descending='false' attribute='new_name'/>
                                      <filter type='and'><filter type='and'>
<condition attribute='new_studentname' value='" + studentId + "' uitype='new_studentmaster' operator='eq'/><condition attribute='new_date' value='" + (oldStartDate.Year + "/" + oldStartDate.Month + "/" + oldStartDate.Day) + "' operator='on-or-after'/><condition attribute='new_date' value='" + (oldEndDate.Year + "/" + oldEndDate.Month + "/" + oldEndDate.Day) + "' operator='on-or-before'/></filter></filter> </entity></fetch>";
            EntityCollection result = _service.RetrieveMultiple(new FetchExpression(record));
            if (result.Entities.Count > 0)
            {
                foreach (Entity data in result.Entities)
                {
                    if (Convert.ToDateTime(data.Attributes["new_date"]) != endDate)
                    {
                        data.Attributes["new_isstudentonleave"] = false;
                        data.Attributes["new_reason"] = string.Empty;
                        _service.Update(data);
                    }
                }
            }
            createAttendanceForNewLeaveRange(totalDays, studentId, studentMasterName, oldStartDate, oldEndDate);

        }

        public void updateDailyAttendanceCase4(int totalDays, string studentId, string studentMasterName, DateTime oldStartDate, DateTime oldEndDate)
        {
            string record = @"<fetch distinct='false' mapping='logical' output-format='xml-platform' version='1.0'>
                                      <entity name='new_dailyattendance'>
                                      <attribute name='new_dailyattendanceid'/>
                                      <attribute name='new_name'/>
                                      <attribute name='new_date'/>
                                      <attribute name='new_isstudentonleave'/>
                                      <attribute name='new_morning'/>
                                      <attribute name='new_afternoon'/>
                                      <order descending='false' attribute='new_name'/>
                                      <filter type='and'><filter type='and'>
<condition attribute='new_studentname' value='" + studentId + "' uitype='new_studentmaster' operator='eq'/><condition attribute='new_date' value='" + (oldStartDate.Year + "/" + oldStartDate.Month + "/" + oldStartDate.Day) + "' operator='on-or-after'/><condition attribute='new_date' value='" + (oldEndDate.Year + "/" + oldEndDate.Month + "/" + oldEndDate.Day) + "' operator='on-or-before'/></filter></filter> </entity></fetch>";
            EntityCollection result = _service.RetrieveMultiple(new FetchExpression(record));
            if (result.Entities.Count > 0)
            {
                foreach (Entity data in result.Entities)
                {
                    if (Convert.ToDateTime(data.Attributes["new_date"]) != startDate)
                    {
                        data.Attributes["new_isstudentonleave"] = false;
                        data.Attributes["new_reason"] = string.Empty;
                        _service.Update(data);
                    }
                }
            }

            createAttendanceForNewLeaveRange(totalDays, studentId, studentMasterName, oldStartDate, oldEndDate);

        }

        public void createAttendanceForNewLeaveRange(int totalDays, string studentId, string studentMasterName, DateTime oldStartDate, DateTime oldEndDate)
        {
            for (int day = 0; day < totalDays + 1; day++)
            {
                DateTime tempStartDate = startDate.AddDays(day);
                string currentRangeRecords = @"<fetch distinct='false' mapping='logical' output-format='xml-platform' version='1.0'>
                                      <entity name='new_dailyattendance'>
                                      <attribute name='new_dailyattendanceid'/>
                                      <attribute name='new_name'/>
                                      <attribute name='new_isstudentonleave'/>
                                      <attribute name='new_morning'/>
                                      <attribute name='new_afternoon'/>
                                      <order descending='false' attribute='new_name'/>
                                      <filter type='and'><filter type='and'>
<condition attribute='new_studentname' value='" + studentId + "' uitype='new_studentmaster' operator='eq'/><condition attribute='new_date' value='" + (tempStartDate.Year + "/" + tempStartDate.Month + "/" + tempStartDate.Day) + "' operator='eq'/></filter></filter> </entity></fetch>";
                EntityCollection records = _service.RetrieveMultiple(new FetchExpression(currentRangeRecords));
                if (records.Entities.Count > 0)
                {
                    foreach (Entity eachRecord in records.Entities)
                    {
                        eachRecord.Attributes["new_isstudentonleave"] = false;
                        eachRecord.Attributes["new_reason"] = string.Empty;
                        _service.Update(eachRecord);
                    }
                }
                else
                {
                    Entity attendance = new Entity("new_dailyattendance");
                    attendance.Attributes["new_studentname"] = new EntityReference(studentMasterName, new Guid(studentId));
                    attendance.Attributes["new_isstudentonleave"] = true;
                    attendance.Attributes["new_date"] = startDate.AddDays(day);
                    attendance.Attributes["new_reason"] = reason;
                    _service.Create(attendance);
                }
            }
        }

        public void onDelete()
        {
            {

                EntityReference entityRef = context.InputParameters["Target"] as EntityReference;
                Entity entity = _service.Retrieve(entityRef.LogicalName, entityRef.Id, new ColumnSet(true));
                if (entity.Contains("new_startdate") && entity.Contains("new_enddate"))
                {
                    startDate = Convert.ToDateTime(entity.Attributes["new_startdate"]);
                    endDate = Convert.ToDateTime(entity.Attributes["new_enddate"]);

                    if (entity.Contains("new_reason"))
                    {
                        reason = Convert.ToString(entity.Attributes["new_reason"]);
                    }

                    var studentId = ((Microsoft.Xrm.Sdk.EntityReference)entity.Attributes["new_studentcode"]).Id;
                    var studentMasterName = ((Microsoft.Xrm.Sdk.EntityReference)entity.Attributes["new_studentcode"]).LogicalName;
                    var totalDays = (endDate - startDate).TotalDays;
                    for (int day = 0; day < totalDays + 1; day++)
                    {
                        DateTime tempStartDate = startDate.AddDays(day);
                        string record = @"<fetch distinct='false' mapping='logical' output-format='xml-platform' version='1.0'>
                                      <entity name='new_dailyattendance'>
                                      <attribute name='new_dailyattendanceid'/>
                                      <attribute name='new_name'/>
                                      <attribute name='new_isstudentonleave'/>
                                      <attribute name='new_morning'/>
                                      <attribute name='new_afternoon'/>
                                      <order descending='false' attribute='new_name'/>
                                      <filter type='and'><filter type='and'>
<condition attribute='new_isstudentonleave' value='1' operator='eq'/>
<condition attribute='new_studentname' value='" + studentId + "' uitype='new_studentmaster' operator='eq'/><condition attribute='new_date' value='" + (tempStartDate.Year + "/" + tempStartDate.Month + "/" + tempStartDate.Day) + "' operator='eq'/></filter></filter> </entity></fetch>";
                        EntityCollection result = _service.RetrieveMultiple(new FetchExpression(record));
                        if (result.Entities.Count > 0)
                        {
                            foreach (Entity data in result.Entities)
                            {
                                _service.Delete(data.LogicalName, data.Id);
                            }
                        }
                    }


                }

            }
        }
    }
}


