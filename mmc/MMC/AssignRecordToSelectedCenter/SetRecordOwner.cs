using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using Microsoft.Xrm.Sdk.Client;
using System.ServiceModel;
using Microsoft.Crm.Sdk.Messages;
using Microsoft.Xrm.Sdk.Messages;

namespace SetRecordOwner
{
    public class SetRecordOwner : IPlugin
    {//
        private IOrganizationService _service;
        private IOrganizationServiceFactory serviceFactory;
        private IPluginExecutionContext context;

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
                        Entity entity = context.InputParameters["Target"] as Entity;
                        getChildCode(entity);
                        if (entity.Attributes.Contains("new_centername"))
                        {

                            var businessunitId = ((Microsoft.Xrm.Sdk.EntityReference)(entity.Attributes["new_centername"])).Id;
                            var ownerid = ((Microsoft.Xrm.Sdk.EntityReference)(entity.Attributes["ownerid"])).Id;
                            var ownerlogicalname = ((Microsoft.Xrm.Sdk.EntityReference)(entity.Attributes["ownerid"])).LogicalName;
                            Entity owner = _service.Retrieve(ownerlogicalname, ownerid, new ColumnSet("businessunitid"));

                            if (((Microsoft.Xrm.Sdk.EntityReference)(owner.Attributes["businessunitid"])).Id != businessunitId)
                            {
                                string records = @"
                                 <fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='false'>
                                  <entity name='systemuser'>
                                    <attribute name='fullname' />
                                    <attribute name='businessunitid' />
                                    <attribute name='title' />
                                    <attribute name='address1_telephone1' />
                                    <attribute name='positionid' />
                                    <attribute name='systemuserid' />
                                    <order attribute='fullname' descending='false' />
                                    <filter type='and'>
                                      <condition attribute='businessunitid' operator='eq'  uitype='businessunit' value='" + businessunitId + "' /></filter></entity></fetch> ";

                                EntityCollection users = _service.RetrieveMultiple(new FetchExpression(records));
                                foreach (var user in users.Entities)
                                {
                                    if (user.Attributes.Contains("systemuserid"))
                                    {
                                        entity.Attributes["ownerid"] = new EntityReference("systemuser", user.Id);
                                        AssignRequest assign = new AssignRequest
                                        {
                                            Assignee = new EntityReference(user.LogicalName,
                                                user.Id),
                                            Target = new EntityReference(entity.LogicalName,
                                                entity.Id)
                                        };
                                        _service.Execute(assign);
                                    }

                                }
                            }
                        }
                    }
                }

                if (context.MessageName == "Update")
                {
                    if (context.InputParameters.Contains("Target") && context.InputParameters["Target"] is Entity)
                    {
                        Entity entity = context.InputParameters["Target"] as Entity;
                        if (entity.Attributes.Contains("new_centername"))
                        {

                            var businessunitId = ((Microsoft.Xrm.Sdk.EntityReference)(entity.Attributes["new_centername"])).Id;
                            Entity owninguser = new Entity("systemuser");

                            string records = @"
                                 <fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='false'>
                                  <entity name='systemuser'>
                                    <attribute name='fullname' />
                                    <attribute name='businessunitid' />
                                    <attribute name='title' />
                                    <attribute name='address1_telephone1' />
                                    <attribute name='positionid' />
                                    <attribute name='systemuserid' />
                                    <order attribute='fullname' descending='false' />
                                    <filter type='and'>
                                      <condition attribute='businessunitid' operator='eq'  uitype='businessunit' value='" + businessunitId + "' /></filter></entity></fetch> ";

                            EntityCollection users = _service.RetrieveMultiple(new FetchExpression(records));
                            foreach (var user in users.Entities)
                            {
                                if (user.Attributes.Contains("systemuserid"))
                                {
                                    owninguser = user;
                                    AssignRequest assign = new AssignRequest
                                    {
                                        Assignee = new EntityReference(owninguser.LogicalName,
                                            owninguser.Id),
                                        Target = new EntityReference(entity.LogicalName,
                                            entity.Id)
                                    };
                                    _service.Execute(assign);

                                }

                            }


                        }
                    }
                }



            }
            catch (Exception ex)
            {
                throw new InvalidPluginExecutionException(ex.ToString());
            }

        }

        public void getChildCode(Entity entity)
        {
            if (entity.LogicalName == "new_studentmaster" && entity.Attributes.Contains("new_centername"))
            {
                //var getInitials = (entity.Attributes["new_studentfirstname"].ToString().Substring(0, 1)) + (entity.Attributes["new_studentlastname"].ToString().Substring(0, 1));
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

                var businessunitId = ((Microsoft.Xrm.Sdk.EntityReference)(entity.Attributes["new_centername"])).Id;
                var BUlogicalName = ((Microsoft.Xrm.Sdk.EntityReference)(entity.Attributes["new_centername"])).LogicalName;
                Entity getBusinessUnit = _service.Retrieve(BUlogicalName, businessunitId, new ColumnSet("new_centercode"));

                var newStudentCounter = (getBusinessUnit.Attributes["new_centercode"]).ToString().ToUpper() + '-' + getCounter.ToString().PadLeft(5, '0');
                entity.Attributes["new_name"] = newStudentCounter;
                _service.Update(entity);

            }
            else if (entity.LogicalName == "new_studentmaster")
            {
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
                var ownerid = ((Microsoft.Xrm.Sdk.EntityReference)(entity.Attributes["ownerid"])).Id;
                var ownerlogicalname = ((Microsoft.Xrm.Sdk.EntityReference)(entity.Attributes["ownerid"])).LogicalName;
                Entity owner = _service.Retrieve(ownerlogicalname, ownerid, new ColumnSet("businessunitid"));
                var businessunitId = ((Microsoft.Xrm.Sdk.EntityReference)(owner.Attributes["businessunitid"])).Id;
                Entity getBusinessUnit = _service.Retrieve("businessunit", businessunitId, new ColumnSet("new_centercode"));
                var newStudentCounter = (getBusinessUnit.Attributes["new_centercode"]).ToString().ToUpper() + '-' + getCounter.ToString().PadLeft(5, '0');
                entity.Attributes["new_name"] = newStudentCounter;
                _service.Update(entity);
            }
        }

    }
}





