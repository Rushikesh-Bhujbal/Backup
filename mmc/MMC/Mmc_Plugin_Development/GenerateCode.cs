using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using Microsoft.Xrm.Sdk.Client;
using System.ServiceModel;


namespace Mmc_Plugin_Development
{
    public class GenerateCode : IPlugin
    {

        public void Execute(IServiceProvider serviceProvider)
        {
            IPluginExecutionContext context = (IPluginExecutionContext)serviceProvider.GetService(typeof(IPluginExecutionContext));
            IOrganizationServiceFactory serviceFactory = (IOrganizationServiceFactory)serviceProvider.GetService(typeof(IOrganizationServiceFactory));
            IOrganizationService _service = serviceFactory.CreateOrganizationService(context.UserId);
            if (context.InputParameters.Contains("Target") && context.InputParameters["Target"] is Entity)
            {
                Entity entity = context.InputParameters["Target"] as Entity;
                //Entity studentmaster = _service.Retrieve("new_studentmaster", context.PrimaryEntityId, new ColumnSet(true));

                //var businessunitId = ((Microsoft.Xrm.Sdk.EntityReference)(entity.Attributes["new_centername"])).Id;
                //var getBuDetails = ((Microsoft.Xrm.Sdk.EntityReference)(entity.Attributes["new_centername"]));


                //var getFirstName = entity.Attributes["new_studentfirstname"].ToString().Substring(0, 1);
                //var getLastName =  entity.Attributes["new_studentlastname"].ToString().Substring(0, 1);


                var getInitials = (entity.Attributes["new_studentfirstname"].ToString().Substring(0, 1)) + (entity.Attributes["new_studentlastname"].ToString().Substring(0, 1));
                var getCounter = 0;


                string record = @"<fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='false'>
                                          <entity name='new_studentcodecounter'>
                                            <attribute name='new_studentcodecounter' />
                                            <attribute name='new_studentcodecounterid' />
                                            <order attribute='new_studentcodecounter' descending='false' />
                                            <filter type='and'>
                                              <condition attribute='new_studentcodecounter' operator='not-null' />
                                            </filter>
                                          </entity>
                                        </fetch>";

                EntityCollection result = _service.RetrieveMultiple(new FetchExpression(record));
                foreach (Entity data in result.Entities)
                {

                    getCounter = Convert.ToInt32(data.Attributes["new_studentcodecounter"]) + 1;
                    data.Attributes["new_studentcodecounter"] = getCounter;
                    _service.Update(data);

                }

                var newStudentCounter = getInitials.ToUpper() + '-' + getCounter.ToString().PadLeft(5, '0');

                entity.Attributes["new_name"] = newStudentCounter;
                _service.Update(entity);




            }
        }
    }
}

