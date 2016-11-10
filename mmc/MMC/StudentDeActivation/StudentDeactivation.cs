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

namespace StudentDeActivation
{
    public class StudentDeactivation : IPlugin
    {
        public void Execute(IServiceProvider serviceProvider)
        {
            IPluginExecutionContext context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
            IOrganizationServiceFactory serviceFactory = (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));
            IOrganizationService _service = serviceFactory.CreateOrganizationService(context.UserId);
            try
            {
                if (context.InputParameters.Contains("Target") && context.InputParameters["Target"] is Entity)
                {
                    Entity entity = context.InputParameters["Target"] as Entity;
                    var businessunitId = entity.Id;
                    if (entity.LogicalName == "businessunit" && Convert.ToBoolean(entity.Attributes["isdisabled"]) == true)
                    {

                        string studentRecord = @"<fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='false'>
                                                <entity name='new_studentmaster'>
                                                <attribute name='new_studentmasterid' />
                                                <order attribute='new_studentfirstname' descending='false' />
                                                <filter type='and'>
                                                    <condition attribute='new_centername' operator='eq' uiname='eternusrnd' uitype='businessunit' value='" + businessunitId + "' /></filter></entity></fetch>";
                        EntityCollection resultStudentMaster = _service.RetrieveMultiple(new FetchExpression(studentRecord));
                        foreach (Entity studentMaster in resultStudentMaster.Entities)
                        {

                            DeactivateRecord(studentMaster.LogicalName, studentMaster.Id, _service);
                        }

                    }

                }
            }
            catch (Exception ex)
            {
                throw new InvalidPluginExecutionException(ex.ToString());
            }
        }
        

        //Deactivate a record
        public static void DeactivateRecord(string entityName, Guid recordId, IOrganizationService organizationService)
        {
           
            var cols = new ColumnSet(new[] { "statecode", "statuscode" });

            //Check if it is Active or not
            var entity = organizationService.Retrieve(entityName, recordId, cols);

            if (entity != null && entity.GetAttributeValue<OptionSetValue>("statecode").Value == 0)
            {
                //StateCode = 1 and StatusCode = 2 for deactivating Account or Contact
                //TEST
                SetStateRequest setStateRequest = new SetStateRequest()
                {
                    EntityMoniker = new EntityReference
                    {
                        Id = recordId,
                        LogicalName = entityName,
                    },
                    State = new OptionSetValue(1),
                    Status = new OptionSetValue(2)
                };
                organizationService.Execute(setStateRequest);
            }
        }
    }
}
