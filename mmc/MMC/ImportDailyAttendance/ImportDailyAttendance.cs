using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using Microsoft.Xrm.Sdk.Client;
using System.ServiceModel;
using Microsoft.Crm.Sdk.Messages;

namespace ImportDailyAttendance
{
    public class ImportDailyAttendance : IPlugin
    {
        public void Execute(IServiceProvider serviceProvider)
        {
            IPluginExecutionContext context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
            IOrganizationServiceFactory serviceFactory = (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));
            IOrganizationService _service = serviceFactory.CreateOrganizationService(context.UserId);

            if (context.InputParameters.Contains("Target") && context.InputParameters["Target"] is Entity)
            {
                Entity entity = context.InputParameters["Target"] as Entity;
                if (entity.LogicalName == "new_importdailyattendance")
                {
                    if (entity.Attributes.Contains("new_date") && entity.Attributes.Contains("new_studentname")) { 
                    string record = @"<fetch distinct='false' mapping='logical' output-format='xml-platform' version='1.0'>
                                      <entity name='new_dailyattendance'>
                                      <attribute name='new_dailyattendanceid'/>
                                      <attribute name='new_name'/>
                                      <attribute name='new_isstudentonleave'/>
                                       <attribute name='new_morning'/>
<attribute name='new_afternoon'/>
                                      <order descending='false' attribute='new_name'/>
                                      <filter type='and'>
                                      
                                      <condition attribute='new_date' value='" + entity.Attributes["new_date"].ToString() + "' operator='on'/><condition attribute='new_studentname' value='" + ((Microsoft.Xrm.Sdk.EntityReference)(entity.Attributes["new_studentname"])).Id + "' operator='eq' uitype='new_studentmaster'/></filter> </entity></fetch>";
                    EntityCollection result = _service.RetrieveMultiple(new FetchExpression(record));
                  
                    if (result.Entities.Count > 0)
                    {
                        foreach (Entity data in result.Entities)
                        {
                            if (Convert.ToBoolean(data.Attributes["new_isstudentonleave"]) == false)
                            {                                           
                                data.Attributes["new_afternoon"] = Convert.ToBoolean(entity.Attributes["new_afternoon"]);
                                data.Attributes["new_morning"] = Convert.ToBoolean(entity.Attributes["new_morning"]);
                                _service.Update(data);
                           }
                           
                        }
                    }
                    else {
                        Entity dailyAttendance = new Entity("new_dailyattendance");
                        dailyAttendance.Attributes["new_afternoon"] = Convert.ToBoolean(entity.Attributes["new_afternoon"]);
                        dailyAttendance.Attributes["new_morning"] = Convert.ToBoolean(entity.Attributes["new_morning"]);
                        dailyAttendance.Attributes["new_studentname"] = new EntityReference("new_studentmaster", ((Microsoft.Xrm.Sdk.EntityReference)(entity.Attributes["new_studentname"])).Id);
                        dailyAttendance.Attributes["new_date"] = Convert.ToDateTime(entity.Attributes["new_date"]);
                        _service.Create(dailyAttendance);
                    }
                   
                }
            }
            }
        }
    }
}
